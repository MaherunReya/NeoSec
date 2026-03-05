import socket
import json
import struct
import os

SOCKET_PATH = "/tmp/neosec.sock"

class SocketClient:
    def __init__(self):
        self.sock = None
        self.is_connected = False
        
    def connect(self, token):
        if self.is_connected:
            return True

        if not os.path.exists(SOCKET_PATH):
             print(f"Socket file {SOCKET_PATH} not found.")
             return False

        try:
            self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.sock.connect(SOCKET_PATH)
            
            # Send Auth
            auth_msg = {"type": "auth", "token": token}
            response = self._send_request(auth_msg)
            
            if response.get("status") == "success":
                self.is_connected = True
                print("Authenticated with daemon.")
                return True
            else:
                print(f"Authentication Failed: {response.get('output')}")
                self.close()
                return False

        except Exception as e:
            print(f"Connection error: {e}")
            self.close()
            return False

    def send_command(self, cmd):
        if not self.is_connected:
            return "Error: Not connected to daemon."
            
        request = {"type": "command", "cmd": cmd}
        response = self._send_request(request)
        
        if response.get("status") == "success":
            return response.get("output", "")
        else:
            return f"Error: {response.get('output', 'Unknown error')}"

    def _send_request(self, data):
        if not self.sock:
            return {"status": "error", "output": "Socket closed"}

        try:
            # 1. Send Length + JSON
            json_data = json.dumps(data).encode()
            length_bytes = struct.pack('>I', len(json_data))
            self.sock.sendall(length_bytes + json_data)
            
            # 2. Receive Length
            resp_len_bytes = self.sock.recv(4)
            if not resp_len_bytes:
                raise ConnectionError("Server closed connection")
                
            resp_len = struct.unpack('>I', resp_len_bytes)[0]
            
            # 3. Receive Body
            resp_bytes = b""
            while len(resp_bytes) < resp_len:
                chunk = self.sock.recv(min(4096, resp_len - len(resp_bytes)))
                if not chunk:
                     raise ConnectionError("Server connection broken")
                resp_bytes += chunk
                
            return json.loads(resp_bytes.decode())
            
        except Exception as e:
            print(f"Communication error: {e}")
            self.close()
            return {"status": "error", "output": str(e)}

    def close(self):
        if self.sock:
            try:
                self.sock.close()
            except:
                pass
        self.sock = None
        self.is_connected = False
