import os
import json
import subprocess
import re
from PySide6.QtCore import QObject, Signal, Property, Slot, QTimer
from .config import VPN_DIR, VPN_METADATA_FILE

class VpnManager(QObject):
    configsChanged = Signal()
    activeConfigChanged = Signal()
    connectionStateChanged = Signal(str, bool) # vpn_id, is_active

    NEOSEC_CONNECTION_NAME = "neosec-vpn"

    def __init__(self):
        super().__init__()
        self._vpn_dir = str(VPN_DIR)
        self._metadata_file = str(VPN_METADATA_FILE)
        self._configs = []
        self._active_vpn_id = ""
        self._ensure_dir_exists()
        
        self._cleanup_neosec_connection()
        self._load_metadata()

        # Polling for external disconnects
        self._poll_timer = QTimer(self)
        self._poll_timer.timeout.connect(self._check_external_status)
        self._poll_timer.start(5000) # Check every 5 seconds

    def _cleanup_neosec_connection(self):
        """Force delete the proprietary connection to ensure clean state."""
        self._run_nmcli(["connection", "delete", self.NEOSEC_CONNECTION_NAME])

    def _run_nmcli(self, args):
        try:
            cmd = ["nmcli"] + args
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return True, result.stdout.strip()
        except subprocess.CalledProcessError as e:
            print(f"DEBUG: nmcli command failed: {e.cmd} - Error: {e.stderr.strip()}")
            return False, e.stderr.strip()
        except FileNotFoundError:
            print("DEBUG: nmcli not found")
            return False, "nmcli not found"

    def _get_all_uuids(self):
        success, output = self._run_nmcli(["-t", "-f", "UUID", "connection", "show"])
        if success:
            return set(line.strip() for line in output.split('\n') if line.strip())
        return set()

    def _import_connection(self, file_path, protocol):
        pre_uuids = self._get_all_uuids()
        
        nm_type = "wireguard" if "wireguard" in protocol.lower() else "openvpn"
        success, output = self._run_nmcli(["connection", "import", "type", nm_type, "file", file_path])
        
        if success:
            post_uuids = self._get_all_uuids()
            new_uuids = post_uuids - pre_uuids
            
            if new_uuids:
                return list(new_uuids)[0]
            
            print("Warning: Import reported success but no new UUID found.")
        else:
            print(f"Failed to import connection: {output}")
        
        return None

    def _delete_connection_nm(self, uuid):
        if not uuid: return
        self._run_nmcli(["connection", "delete", uuid])

    def _rename_connection(self, uuid, new_name):
        if not uuid: return False
        success, _ = self._run_nmcli(["connection", "modify", uuid, "connection.id", new_name])
        return success

    def _connect_connection(self, name_or_uuid):
        if not name_or_uuid: return False
        success, _ = self._run_nmcli(["connection", "up", name_or_uuid])
        return success

    def _disconnect_connection(self, name_or_uuid):
        if not name_or_uuid: return False
        success, _ = self._run_nmcli(["connection", "down", name_or_uuid])
        return success

    def _ensure_dir_exists(self):
        if not os.path.exists(self._vpn_dir):
            try:
                os.makedirs(self._vpn_dir)
            except OSError as e:
                print(f"Error creating VPN directory: {e}")

    def _load_metadata(self):
        if os.path.exists(self._metadata_file):
            try:
                with open(self._metadata_file, "r") as f:
                    self._configs = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                print(f"Error loading metadata: {e}")
                self._configs = []
        
        for cfg in self._configs:
            cfg['active'] = False
        self._active_vpn_id = ""
            
        self.configsChanged.emit()

    def _save_metadata(self):
        try:
            with open(self._metadata_file, "w") as f:
                json.dump(self._configs, f, indent=4)
        except OSError as e:
            print(f"Error saving metadata: {e}")

    @Slot(list)
    def update_vpns(self, vpn_data):
        new_configs = []
        fetched_ids = set()
        
        try:
            for vpn in vpn_data:
                vpn_id = vpn.get("id")
                fetched_ids.add(vpn_id)
                name = vpn.get("name")
                config_filename = vpn.get("configFileName")
                protocol = vpn.get("protocol", "WireGuard")
                config_content = vpn.get("config_content")
                
                base_name, ext = os.path.splitext(config_filename)
                
                short_id = vpn_id.split("-")[0] if "-" in str(vpn_id) else str(vpn_id)[:8]
                
                if "wireguard" in protocol.lower():
                    unique_filename = f"wg_{short_id}{ext}"
                elif "openvpn" in protocol.lower():
                    unique_filename = f"ov_{short_id}{ext}"
                else:
                     unique_filename = f"{base_name}_{vpn_id}{ext}"
                
                save_path = os.path.join(self._vpn_dir, unique_filename)

                if config_content:
                    try:
                        with open(save_path, 'wb') as f:
                            f.write(config_content)
                    except OSError as e:
                        print(f"Failed to save config {name}: {e}")
                
                entry = {
                    "id": vpn_id,
                    "name": name,
                    "type": protocol,
                    "path": save_path,
                    "filename": unique_filename,
                    "active": vpn_id == self._active_vpn_id
                }
                new_configs.append(entry)

            for old_cfg in self._configs:
                old_id = old_cfg.get("id")
                old_path = old_cfg.get("path")
                
                if old_id and old_id not in fetched_ids:
                    if old_path and os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                            print(f"Removed deleted VPN config: {old_path}")
                        except OSError as e:
                            print(f"Error removing file {old_path}: {e}")

            self._configs = new_configs
            self._save_metadata()
            self.configsChanged.emit()

        except Exception as e:
            print(f"Error updating VPNs: {e}")

    @Property(list, notify=configsChanged)
    def configs(self):
        sorted_configs = sorted(self._configs, key=lambda x: x.get('name', ''))
        return [dict(c) for c in sorted_configs]

    @Slot(str)
    def toggleConnection(self, vpn_id):
        if self._active_vpn_id == vpn_id:
            print(f"Disconnecting {vpn_id}...")
            if self._disconnect_connection(self.NEOSEC_CONNECTION_NAME):
                old_id = self._active_vpn_id
                self._run_nmcli(["connection", "delete", self.NEOSEC_CONNECTION_NAME])
                self._active_vpn_id = ""
                self.connectionStateChanged.emit(old_id, False)
                return True, ""
            else:
                print("Failed to disconnect")
                return False, "Failed to disconnect connection"
        else:
            self._run_nmcli(["connection", "delete", self.NEOSEC_CONNECTION_NAME])
            
            self._active_vpn_id = ""

            path = self._get_path_by_id(vpn_id)
            if not path or not os.path.exists(path):
                print("Error: Config file not found")
                return False, "Config file not found locally"

            protocol = self._get_proto_by_id(vpn_id)
            
            print(f"Importing and connecting to {path}...")
            uuid = self._import_connection(path, protocol)
            
            if uuid:
                print(f"DEBUG: Import successful, UUID: {uuid}")
                if self._rename_connection(uuid, self.NEOSEC_CONNECTION_NAME):
                    print(f"DEBUG: Rename successful, connecting to {self.NEOSEC_CONNECTION_NAME}...")
                    success, error_msg = self._connect_connection_detailed(self.NEOSEC_CONNECTION_NAME)
                    if success:
                        print("DEBUG: Connection UP successful")
                        self._active_vpn_id = vpn_id
                        self.connectionStateChanged.emit(vpn_id, True)
                    else:
                        print(f"DEBUG: Connection UP failed: {error_msg}")
                        self._run_nmcli(["connection", "delete", self.NEOSEC_CONNECTION_NAME])
                        # Emit a special failure signal or just rely on the return state
                        if "Secrets were required" in error_msg or "password" in error_msg.lower():
                            print("💡 [VpnManager] Hint: This connection likely requires a password. Please save it in NetworkManager.")
                        return False, error_msg
                else:
                    print("DEBUG: Rename failed")
                    self._delete_connection_nm(uuid)
                    return False, "Failed to rename connection"
            else:
                print("DEBUG: Import failed")
                return False, "Failed to import .ovpn/.conf file"

        for cfg in self._configs:
            cfg["active"] = (cfg["id"] == self._active_vpn_id)
        
        self.configsChanged.emit()
        self.activeConfigChanged.emit()
        return True, ""

    def _connect_connection_detailed(self, name_or_uuid):
        """Connect and return success status + error message if any."""
        if not name_or_uuid: return False, "No connection name"
        success, output = self._run_nmcli(["connection", "up", name_or_uuid])
        return success, output
    def _get_path_by_id(self, vpn_id):
        for cfg in self._configs:
            if cfg.get("id") == vpn_id:
                return cfg.get("path")
        return ""
    
    def _get_proto_by_id(self, vpn_id):
        for cfg in self._configs:
            if cfg.get("id") == vpn_id:
                return cfg.get("type", "WireGuard")
        return "WireGuard"

    @Property(bool, notify=activeConfigChanged)
    def hasActiveConnection(self):
        return self._active_vpn_id != ""

    @Property(str, notify=activeConfigChanged)
    def activeConfigId(self):
        return self._active_vpn_id

    def _check_external_status(self):
        """Check if the VPN connection is still active in NetworkManager."""
        # Only care if we THINK we have an active connection
        if not self._active_vpn_id:
            return

        # Check if 'neosec-vpn' is in the list of active connections
        success, output = self._run_nmcli(["-t", "-f", "NAME,STATE", "connection", "show", "--active"])
        
        is_still_up = False
        if success:
            lines = output.split('\n')
            for line in lines:
                if line.startswith(f"{self.NEOSEC_CONNECTION_NAME}:"):
                    is_still_up = True
                    break
        
        if not is_still_up:
            print(f"⚠️  [VpnManager] Detected external disconnect of {self.NEOSEC_CONNECTION_NAME}")
            old_id = self._active_vpn_id
            self._active_vpn_id = ""
            for cfg in self._configs:
                cfg["active"] = False
            self.configsChanged.emit()
            self.activeConfigChanged.emit()
            self.connectionStateChanged.emit(old_id, False)
