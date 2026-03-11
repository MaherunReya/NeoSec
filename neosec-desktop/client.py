import socketio
import socket
import json
import struct
import os
import time

from config import SOCKET_PATH, BACKEND_URL

class NeosecClient:
    """
    A unified client handling both remote Socket.IO connections and local 
    Unix socket daemon connections.
    """
    def __init__(self, server_url=BACKEND_URL, socket_path=SOCKET_PATH):
        self.server_url = server_url
        self.token = None
        self.socket_path = socket_path
        
        # Web Socket (Socket.IO)
        self.sio = socketio.Client()
        self.sio_connected = False
        self.setup_sio_events()
        
        # Daemon Socket (Unix)
        self.daemon_sock = None
        self.daemon_connected = False

    @property
    def is_connected(self):
        return self.daemon_connected

    def connect(self, token):
        """
        Connects to both the remote WebSocket server and local Unix daemon.
        WebSocket connects in the background and does not block.
        """
        self.token = token
        self.connect_daemon()
        self.connect_websocket()

    def setup_sio_events(self):
        @self.sio.event
        def connect():
            self.sio_connected = True
            print(f"✅ [WebSocket] Connected successfully! ID: {self.sio.get_sid()}")

        @self.sio.event
        def connect_error(data):
            self.sio_connected = False
            print(f"❌ [WebSocket] Connection failed! Details: {data}")
            if isinstance(data, dict) and 'message' in data:
                print(f"   Error Message: {data['message']}")

        @self.sio.event
        def disconnect():
            self.sio_connected = False
            print("🔌 [WebSocket] Disconnected from server.")

        @self.sio.on('userUpdated')
        def on_user_updated(data):
            print(f"📩 [App Event] 'userUpdated' payload received: {data}")

        @self.sio.on('*')
        def catch_all(event, data):
            print(f"📩 [Global Event] '{event}' payload received: {data}")

    def connect_websocket(self):
        if self.sio_connected:
            return
            
        print(f"Attempting to connect to WebSocket at {self.server_url}...")
        
        # Handle the case where the server is behind a path (e.g., /api)
        url = self.server_url
        socketio_path = '/socket.io'
        
        if '/api' in url:
            # If URL ends with /api, we strip it from the base URL 
            # and prepend it to the socketio_path
            if url.endswith('/api'):
                url = url[:-4]
                socketio_path = '/api/socket.io'
            elif '/api/' in url:
                # Handle cases like https://example.com/api/v1
                parts = url.split('/api', 1)
                url = parts[0]
                socketio_path = f"/api{parts[1].rstrip('/')}/socket.io"

        try:
            self.sio.connect(
                url, 
                auth={'token': self.token},
                socketio_path=socketio_path,
                wait_timeout=10
            )
        except socketio.exceptions.ConnectionError as e:
            print(f"❌ Failed to connect to WebSocket at {url} (path: {socketio_path}): {e}")
            print(f"   Common causes: Server down, invalid URL, or path mismatch.")

    def connect_daemon(self):
        if self.daemon_connected:
            return True

        if not os.path.exists(self.socket_path):
             print(f"Socket file {self.socket_path} not found.")
             return False

        print(f"Attempting to connect to local daemon at {self.socket_path}...")
        try:
            self.daemon_sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.daemon_sock.connect(self.socket_path)
            
            # Send Auth
            auth_msg = {"type": "auth", "token": self.token}
            response = self._send_daemon_request(auth_msg)
            
            if response.get("status") == "success":
                self.daemon_connected = True
                print("✅ [Daemon] Authenticated with daemon.")
                return True
            else:
                print(f"❌ [Daemon] Authentication Failed: {response.get('output')}")
                self.close_daemon()
                return False

        except Exception as e:
            print(f"❌ [Daemon] Connection error: {e}")
            self.close_daemon()
            return False

    def send_command(self, cmd):
        if not self.daemon_connected:
            return "Error: Not connected to daemon."
            
        request = {"type": "command", "cmd": cmd}
        response = self._send_daemon_request(request)
        
        if response.get("status") == "success":
            return response.get("output", "")
        else:
            return f"Error: {response.get('output', 'Unknown error')}"

    def _send_daemon_request(self, data):
        if not self.daemon_sock:
            return {"status": "error", "output": "Socket closed"}

        try:
            # 1. Send Length + JSON
            json_data = json.dumps(data).encode()
            length_bytes = struct.pack('>I', len(json_data))
            self.daemon_sock.sendall(length_bytes + json_data)
            
            # 2. Receive Length
            resp_len_bytes = self.daemon_sock.recv(4)
            if not resp_len_bytes:
                raise ConnectionError("Server closed connection")
                
            resp_len = struct.unpack('>I', resp_len_bytes)[0]
            
            # 3. Receive Body
            resp_bytes = b""
            while len(resp_bytes) < resp_len:
                chunk = self.daemon_sock.recv(min(4096, resp_len - len(resp_bytes)))
                if not chunk:
                     raise ConnectionError("Server connection broken")
                resp_bytes += chunk
                
            return json.loads(resp_bytes.decode())
            
        except Exception as e:
            print(f"Communication error: {e}")
            self.close_daemon()
            return {"status": "error", "output": str(e)}

    def close_daemon(self):
        if self.daemon_sock:
            try:
                self.daemon_sock.close()
            except:
                pass
        self.daemon_sock = None
        self.daemon_connected = False

    def close(self):
        """Disconnects both clients gracefully."""
        if self.sio_connected:
            print("Disconnecting WebSocket client...")
            self.sio.disconnect()
        self.close_daemon()
        print("🔌 [Daemon] Disconnected.")
