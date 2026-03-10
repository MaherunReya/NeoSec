import asyncio
import json
import os
import struct
import subprocess
import sys
from pathlib import Path

from config import AUTH_FILE, SOCKET_PATH

class UnixSocketServer:
    def __init__(self):
        self.server = None

    async def handle_client(self, reader, writer):
        address = writer.get_extra_info('peername')
        print(f"New connection")

        authenticated = False
        
        try:
            while True:
                # 1. Read Message Length (4 bytes big endian)
                length_bytes = await reader.read(4)
                if not length_bytes:
                    break # Connection closed
                
                msg_length = struct.unpack('>I', length_bytes)[0]
                
                # 2. Read JSON payload
                data_bytes = await reader.readexactly(msg_length)
                try:
                    message = json.loads(data_bytes.decode())
                except json.JSONDecodeError:
                    print(f"Invalid JSON received")
                    break
                
                print(f"Received: {message}")

                # 3. Process Message
                response = {"status": "error", "output": "Unknown error"}

                msg_type = message.get('type')
                
                if msg_type == 'auth':
                    token = message.get('token')
                    if self.verify_token(token):
                        authenticated = True
                        response = {"status": "success", "output": "Authenticated"}
                    else:
                        response = {"status": "error", "output": "Authentication failed"}
                        # Close connection on auth failure? Usually good practice but we send error first.
                    print(response)

                elif msg_type == 'command':
                    if not authenticated:
                        response = {"status": "error", "output": "Not authenticated"}
                    else:
                        cmd = message.get('cmd')
                        response = self.execute_command(cmd)
                
                else:
                    response = {"status": "error", "output": "Unknown message type"}

                # 4. Send Response
                resp_json = json.dumps(response).encode()
                resp_len = struct.pack('>I', len(resp_json))
                writer.write(resp_len + resp_json)
                await writer.drain()

                if not authenticated and msg_type == 'auth':
                     break # Force disconnect if auth failed initial attempt
                     
        except asyncio.IncompleteReadError:
            pass
        except Exception as e:
            print(f"Connection error: {e}")
        finally:
            print("Closing connection")
            writer.close()
            await writer.wait_closed()

    def verify_token(self, token):
        if not token or not AUTH_FILE.exists():
            return True
            return False
        try:
            data = json.loads(AUTH_FILE.read_text())
            stored_token = data.get('token')
            return stored_token is not None and stored_token == token
        except:
            return False

    def execute_command(self, command):
        if not command:
            return {'status': 'error', 'output': 'No command provided'}
        
        # Whitelist
        if "nmcli" not in command and "iptables" not in command:
             return {'status': 'error', 'output': 'Command not allowed. Only nmcli and iptables are permitted.'}

        try:
            output = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT)
            return {'status': 'success', 'output': output.decode().strip()}
        except subprocess.CalledProcessError as e:
            return {'status': 'error', 'output': e.output.decode().strip()}
        except Exception as e:
            return {'status': 'error', 'output': str(e)}

    async def start(self):
        if os.path.exists(SOCKET_PATH):
            os.remove(SOCKET_PATH)
        
        self.server = await asyncio.start_unix_server(self.handle_client, path=SOCKET_PATH)
        os.chmod(SOCKET_PATH, 0o666)
        
        print(f"Serving on {SOCKET_PATH}")
        
        async with self.server:
            await self.server.serve_forever()

if __name__ == '__main__':
    try:
        server = UnixSocketServer()
        asyncio.run(server.start())
    except KeyboardInterrupt:
        pass
