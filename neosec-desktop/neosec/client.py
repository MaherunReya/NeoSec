import socketio
import socket
import json
import struct
import os
import time

from .config import SOCKET_PATH, BACKEND_URL

class NeosecWebSocketClient:
    """
    Handles remote Socket.IO connections and events.
    """
    def __init__(self, server_url=BACKEND_URL):
        self.server_url = server_url
        self.token = None
        self.sio = socketio.Client()
        self.sio_connected = False
        self.setup_sio_events()

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

    def connect(self, token):
        if self.sio_connected:
            return
        self.token = token
        
        # Handle the case where the server is behind a path (e.g., /api)
        url = self.server_url
        socketio_path = '/socket.io'
        
        if '/api' in url:
            if url.endswith('/api'):
                url = url[:-4]
                socketio_path = '/api/socket.io'
            elif '/api/' in url:
                parts = url.split('/api', 1)
                url = parts[0]
                socketio_path = f"/api{parts[1].rstrip('/')}/socket.io"

        print(f"Attempting to connect to WebSocket at {url} with path {socketio_path}...")
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

    def close(self):
        if self.sio_connected:
            print("Disconnecting WebSocket client...")
            self.sio.disconnect()


class NeosecDaemonClient:
    """
    Handles local Unix socket daemon connections.
    """
    def __init__(self, socket_path=SOCKET_PATH):
        self.socket_path = socket_path
        self.token = None
        self.daemon_sock = None
        self.daemon_connected = False

    @property
    def is_connected(self):
        return self.daemon_connected

    def connect(self, token):
        if self.daemon_connected:
            return True

        self.token = token
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
                self.close()
                return False

        except Exception as e:
            print(f"❌ [Daemon] Connection error: {e}")
            self.close()
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
            # Use makefile for high-level stream handling (NDJSON)
            with self.daemon_sock.makefile('rw', encoding='utf-8', buffering=1) as f:
                # 1. Send JSON + Newline
                f.write(json.dumps(data) + '\n')
                
                # 2. Receive JSON + Newline
                resp_line = f.readline()
                if not resp_line:
                    raise ConnectionError("Server closed connection")
                    
                return json.loads(resp_line)
            
        except Exception as e:
            print(f"Communication error: {e}")
            self.close()
            return {"status": "error", "output": str(e)}

    def close(self):
        if self.daemon_sock:
            try:
                self.daemon_sock.close()
            except:
                pass
        self.daemon_sock = None
        self.daemon_connected = False
        print("🔌 [Daemon] Disconnected.")
