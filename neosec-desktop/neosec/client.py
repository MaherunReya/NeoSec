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
        # RC-3 fix: explicit reconnection config so the socket survives the
        # routing-table flip that happens when a full-tunnel VPN comes up.
        self.sio = socketio.Client(
            reconnection=True,
            reconnection_attempts=0,        # 0 = retry indefinitely
            reconnection_delay=1,           # first retry after 1 s
            reconnection_delay_max=10,      # cap backoff at 10 s
            randomization_factor=0.5,
        )
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

    def _reload_vpn_configs_sync(self, config_id):
        """Ensure the config file for `config_id` exists locally.

        RC-1 fix: Cache-first. If the file is already on disk we skip ALL
        HTTP traffic so the reload does not eat into the server's 10-second
        ack window.

        RC-4 fix: If we do need to fetch the file, retry up to 3 times with
        a 1-second pause between attempts so a brief network hiccup (e.g. a
        previous VPN session being torn down) does not permanently break the
        download.
        """
        if not self.vpn_manager or not self.token:
            return

        # ── Cache-first check ───────────────────────────────────────────────
        cached_path = self.vpn_manager._get_path_by_id(config_id)
        if cached_path and os.path.exists(cached_path):
            print(f"✅ [VPN Reload] Config '{config_id}' already cached at {cached_path}. "
                  "Skipping network reload.")
            return

        # ── Targeted download (this config only) ────────────────────────────
        print(f"🔄 [VPN Reload] Cache miss for '{config_id}'. Fetching from server...")
        headers = {"Authorization": f"Bearer {self.token}"}

        # Step A: fetch the full VPN list (metadata only — no file content yet)
        # We need it to call update_vpns() which expects the full user list so
        # it can clean up removed entries. Only the target gets a file download.
        for attempt in range(1, 4):
            try:
                resp = requests.get(VPN_URL, headers=headers, timeout=10)
                if resp.status_code != 200:
                    raise OSError(f"HTTP {resp.status_code} listing VPNs")
                data = resp.json()
                if not data.get("success"):
                    raise OSError("Server returned success=false listing VPNs")
                vpn_list = data.get("data", [])
                break
            except Exception as exc:
                print(f"⚠️  [VPN Reload] List attempt {attempt}/3 failed: {exc}")
                if attempt < 3:
                    time.sleep(1)
        else:
            print("❌ [VPN Reload] All list attempts failed. Using cached configs.")
            return

        # Step B: download the file only for the target config; use cached
        # bytes for everything else to keep the call fast.
        full_data = []
        for vpn in vpn_list:
            vpn_id = vpn.get("id")
            if vpn_id == config_id:
                # Targeted download with retry
                content = None
                for attempt in range(1, 4):
                    try:
                        dl_url = f"{VPN_URL}/{vpn_id}/download"
                        dl = requests.get(dl_url, headers=headers, timeout=15)
                        if dl.status_code == 200:
                            content = dl.content
                            break
                        raise OSError(f"HTTP {dl.status_code} downloading config")
                    except Exception as exc:
                        print(f"⚠️  [VPN Reload] Download attempt {attempt}/3 "
                              f"for '{vpn_id}' failed: {exc}")
                        if attempt < 3:
                            time.sleep(1)
                vpn["config_content"] = content
            else:
                # Re-use existing cached bytes — avoids downloading every config.
                existing_path = self.vpn_manager._get_path_by_id(vpn_id)
                if existing_path and os.path.exists(existing_path):
                    with open(existing_path, "rb") as fh:
                        vpn["config_content"] = fh.read()
                else:
                    vpn["config_content"] = None
            full_data.append(vpn)

        print(f"✅ [VPN Reload] Updating VpnManager with {len(full_data)} entry/entries.")
        self.vpn_manager.update_vpns(full_data)

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

        # RC-3 fix: keep sio_connected in sync and log reconnection activity
        # so we know the socket recovered after a VPN-induced route change.
        @self.sio.event
        def reconnect(attempt_number):
            self.sio_connected = True
            print(f"♻️  [WebSocket] Reconnected after {attempt_number} attempt(s). "
                  f"New SID: {self.sio.get_sid()}")

        @self.sio.event
        def reconnect_attempt(attempt_number):
            print(f"🔁 [WebSocket] Reconnect attempt #{attempt_number}...")

        @self.sio.event
        def reconnect_failed():
            self.sio_connected = False
            print("❌ [WebSocket] All reconnect attempts exhausted.")

        @self.sio.on('userUpdated')
        def on_user_updated(data):
            print(f"📩 [App Event] 'userUpdated' payload received: {data}")

        @self.sio.on('RequestVpnToggle')
        def on_request_vpn_toggle(data, callback=None):
            print(f"📩 [App Event] 'RequestVpnToggle' payload received: {data}")
            try:
                # Server (VpnController.js) sends exactly:
                #   { configId, action, protocol, configFileName }
                config_id = data.get('configId')
                action    = data.get('action', 'connect')  # 'connect' | 'disconnect'

                if not config_id:
                    raise RuntimeError("'configId' missing from server payload.")

                if not self.vpn_manager:
                    raise RuntimeError(
                        "VpnManager is not available. "
                        "Call set_vpn_manager() before handling VPN toggle events."
                    )

                # ── Step 1 (RC-1 / RC-4): Cache-first reload ─────────────────
                # Only downloads the file if it is not already on disk.
                # Uses retries for transient network errors.
                self._reload_vpn_configs_sync(config_id)

                # ── Step 2 (RC-2): Optimistic ack BEFORE the VPN toggle ───────
                # Calling toggleConnection() brings up the VPN tunnel.  For
                # full-tunnel configs this immediately reroutes all traffic
                # through the new interface, dropping the existing TCP connection
                # to the backend.  If we call callback() *after* that, the ack
                # is sent on a dead socket and the server times out.
                #
                # Sending the ack first (while the socket is still live) ensures
                # the server receives a definitive "success" before any route
                # change happens.  If the subsequent toggle fails we log the
                # error locally; the VPN state mismatch is recoverable via the
                # server's next poll / user retry.
                print(f"📤 [VPN] Sending ack to server before toggle "
                      f"(action={action}, configId={config_id})")
                if callable(callback):
                    callback({"status": "success",
                              "message": f"VPN {action} initiated"})

                # ── Step 3: Delegate to VpnManager ───────────────────────────
                print(f"⚙️  [VPN] Calling VpnManager.toggleConnection('{config_id}')")
                self.vpn_manager.toggleConnection(config_id)
                print(f"✅ [VPN] toggleConnection('{config_id}') completed.")
                return  # callback already sent above

            except Exception as e:
                print(f"❌ [VPN] Toggle failed: {e}")
                result = {"status": "error", "message": str(e)}
                # Error ack — socket may or may not still be alive
                if callable(callback):
                    try:
                        callback(result)
                    except Exception as cb_err:
                        print(f"⚠️  [VPN] Could not deliver error ack: {cb_err}")


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
