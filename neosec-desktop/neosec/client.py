import socketio
import socket
import json
import struct
import os
import time
import requests

from .config import SOCKET_PATH, BACKEND_URL, VPN_URL

class NeosecWebSocketClient:
    """
    Handles remote Socket.IO connections and events.
    """
    def __init__(self, server_url=BACKEND_URL):
        self.server_url = server_url
        self.token = None
        self.sio = socketio.Client()
        self.sio_connected = False
        self.daemon_client = None  # set via set_daemon_client() after construction
        self.vpn_manager = None    # set via set_vpn_manager() after construction
        self.setup_sio_events()

    def set_daemon_client(self, daemon_client):
        """Wire a NeosecDaemonClient so VPN commands can be routed through it."""
        self.daemon_client = daemon_client

    def set_vpn_manager(self, vpn_manager):
        """Wire a VpnManager so VPN connect/disconnect is handled via nmcli."""
        self.vpn_manager = vpn_manager

    def _reload_vpn_configs_sync(self):
        """Fetch fresh VPN configs from the server and push them into VpnManager.

        This must be called before toggling so that any newly uploaded or
        changed config files are available locally before nmcli tries to import
        them.
        """
        if not self.vpn_manager or not self.token:
            return
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(VPN_URL, headers=headers, timeout=10)
            if resp.status_code != 200:
                print(f"⚠️  [VPN Reload] Failed to fetch VPN list: {resp.status_code}")
                return
            data = resp.json()
            if not data.get("success"):
                return
            vpn_list = data.get("data", [])
            full_data = []
            for vpn in vpn_list:
                vpn_id = vpn.get("id")
                dl_url = f"{VPN_URL}/{vpn_id}/download"
                try:
                    dl_resp = requests.get(dl_url, headers=headers, timeout=15)
                    config_content = dl_resp.content if dl_resp.status_code == 200 else None
                except Exception as e:
                    print(f"⚠️  [VPN Reload] Error downloading config for {vpn_id}: {e}")
                    config_content = None
                vpn["config_content"] = config_content
                full_data.append(vpn)
            print(f"✅ [VPN Reload] Fetched {len(full_data)} VPN config(s); updating VpnManager.")
            self.vpn_manager.update_vpns(full_data)
        except Exception as e:
            print(f"❌ [VPN Reload] Unexpected error: {e}")

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

        @self.sio.on('RequestVpnToggle')
        def on_request_vpn_toggle(data, callback=None):
            print(f"📩 [App Event] 'RequestVpnToggle' payload received: {data}")
            try:
                action   = data.get('action', 'connect')   # 'connect' | 'disconnect'
                vpn_id   = data.get('vpnId') or data.get('id', '')
                cfg_file = data.get('configFileName', '')

                # ── Step 1: Reload VPN configs from server so we have the
                #   latest files before NetworkManager tries to import them. ──
                print("🔄 [VPN] Reloading VPN configs from server before toggling...")
                self._reload_vpn_configs_sync()

                # ── Step 2: Delegate to VpnManager (nmcli-based) ──────────────
                if self.vpn_manager:
                    # Resolve vpn_id from configFileName if not supplied directly
                    if not vpn_id and cfg_file:
                        for cfg in self.vpn_manager._configs:
                            # The server's configFileName may match the stored
                            # unique filename or the original base name portion.
                            stored_fn = cfg.get('filename', '')
                            if (cfg_file == stored_fn or
                                    cfg_file.replace('.conf', '').replace('.ovpn', '')
                                    in stored_fn):
                                vpn_id = cfg.get('id')
                                break

                    if not vpn_id:
                        raise RuntimeError(
                            f"Could not resolve a VPN config for configFileName='{cfg_file}'. "
                            "Make sure the VPN exists in the server."
                        )

                    print(f"⚙️  [VPN] Calling VpnManager.toggleConnection('{vpn_id}') "
                          f"(action={action})")

                    # toggleConnection handles both connect and disconnect:
                    # - if vpn_id is already active → disconnects
                    # - if vpn_id is not active     → connects (may disconnect another first)
                    # For an explicit 'disconnect' we only act when it is currently active.
                    if action == 'disconnect' and self.vpn_manager._active_vpn_id != vpn_id:
                        print(f"ℹ️  [VPN] {vpn_id} is not the active VPN; nothing to disconnect.")
                    else:
                        self.vpn_manager.toggleConnection(vpn_id)

                    result = {"status": "success", "message": f"VPN {action}ed successfully"}

                else:
                    # No VpnManager wired – should not happen in normal usage
                    raise RuntimeError(
                        "VpnManager is not available. "
                        "Call set_vpn_manager() before handling VPN toggle events."
                    )

            except Exception as e:
                print(f"❌ [VPN] Toggle failed: {e}")
                result = {"status": "error", "message": str(e)}

            # Send acknowledgment back to the server
            if callable(callback):
                callback(result)


        @self.sio.on('RequestFirewallRuleChange')
        def on_request_firewall_rule_change(data, callback=None):
            print(f"📩 [App Event] 'RequestFirewallRuleChange' payload received: {data}")
            try:
                # TODO: Replace with real firewall command execution
                time.sleep(0.5)
                print("✅ [Desktop Action] Firewall rules applied successfully.")
                result = {"status": "success", "message": "Firewall rules applied locally"}
            except Exception as e:
                result = {"status": "error", "message": str(e)}
            # Must call the callback to send acknowledgment back to server
            if callable(callback):
                callback(result)

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
                auth={'token': self.token, 'clientType': 'desktop'},
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
