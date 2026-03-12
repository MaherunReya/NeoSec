from neosec.client import NeosecWebSocketClient, NeosecDaemonClient
from PySide6.QtCore import QObject, Signal, Slot, QRunnable, QThreadPool
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtGui import QGuiApplication
from neosec.firewall import Firewall
from neosec.dashboard import DashboardBackend
from neosec.vpn import VpnManager
import sys
import requests
import json
from pathlib import Path

from neosec.config import *

class AuthWorker(QRunnable):
    def __init__(self, user, password, backend_signals):
        super().__init__()
        self.user = user
        self.password = password
        self.signals = backend_signals

    def run(self):
        if not self.user or not self.password:
            self.signals.loginFailed.emit("Please enter valid email and password")
            self.signals.authenticationFinished.emit()
            return
        try:
            AUTH_FILE.unlink(missing_ok=True)
            payload = {"email": self.user, "password": self.password}
            resp = requests.post(AUTH_URL, data=payload, timeout=10)
            try:
                data = resp.json()
            except ValueError:
                data = {}

            if resp.status_code == 200 and data.get('success'):
                AUTH_FILE.write_text(json.dumps(data, indent=4))
                self.signals.loginFileSaved.emit()
            else:
                message = data.get("message")
                if not message:
                    if resp.status_code == 401:
                        message = "Invalid email or password"
                    else:
                        message = f"Login failed (Error {resp.status_code})"
                self.signals.loginFailed.emit(message)

        except requests.exceptions.RequestException as e:
            self.signals.loginFailed.emit(f"Connection error: {str(e)}")
        except Exception as e:
            self.signals.loginFailed.emit(f"An unexpected error occurred: {str(e)}")
        finally:
            self.signals.authenticationFinished.emit()


class AuthFileWorker(QRunnable):
    def __init__(self, backend_signals):
        super().__init__()
        self.signals = backend_signals

    def run(self):
        if AUTH_FILE.exists():
            try:
                auth_data = json.loads(AUTH_FILE.read_text())
                token = auth_data.get("token")
                if token:
                    headers = {"Authorization": f"Bearer {token}"}
                    resp = requests.get(VERIFICATION_URL, headers=headers, timeout=10)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("success"):
                            email = data.get('email')
                            role = data.get('role', 'User')
                            self.signals.loginSuccess.emit(email, role, token)
                            return
                AUTH_FILE.unlink(missing_ok=True)
            except Exception as e:
                print(f"Auth file check failed: {e}")
                
        self.signals.authenticationFinished.emit()

class FirewallRulesParser(QRunnable):
    def __init__(self, token, backend_signals):
        super().__init__()
        self.token = token
        self.signals = backend_signals

    def run(self):
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(FIREWALL_URL, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                raw_rules = data if isinstance(data, list) else data.get("data", [])
                processed_rules = []
                for r in raw_rules:
                    processed_rules.append({
                        "ip_address": r.get("ip_address", "0.0.0.0"),
                        "port_start": self._parse_port(r.get("port_start"), r.get("port_end"), True),
                        "port_end": self._parse_port(r.get("port_start"), r.get("port_end"), False),
                        "protocol": self._map_protocol(r.get("protocol", 0)),
                        "rule_action": "ALLOW" if r.get("action") == 0 else ("DENY" if r.get("action")==1 else "DROP"),
                        "rule_enabled": True 
                    })
                self.signals.rulesFetched.emit(processed_rules)
            else:
                print(f"Failed to fetch rules. Status: {resp.status_code}")
        except Exception as e:
            print(f"Failed to fetch rules: {e}")

    def _parse_port(self, start, end, is_start):
        if start is None and end is None:
            return "0" if is_start else "65535"
        if start is None:
            return str(end)
        if end is None:
            return str(start)
        return str(start) if is_start else str(end)

    def _map_protocol(self, proto_id):
        mapping = {0: "TCP", 1: "UDP", 2: "BOTH"}
        return mapping.get(proto_id, str(proto_id))


class VpnFetcher(QRunnable):
    def __init__(self, token, backend_signals):
        super().__init__()
        self.token = token
        self.signals = backend_signals
        self.api_base = VPN_URL

    def run(self):
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(self.api_base, headers=headers, timeout=10)
            if resp.status_code != 200:
                print(f"Failed to fetch VPNs: {resp.status_code}")
                return
            
            data = resp.json()
            if not data.get("success"):
                return
            vpn_list = data.get("data", [])
            full_data = []
            for vpn in vpn_list:
                vpn_id = vpn.get("id")
                dl_url = f"{self.api_base}/{vpn_id}/download"
                try:
                    dl_resp = requests.get(dl_url, headers=headers, timeout=15)
                    config_content = dl_resp.content if dl_resp.status_code == 200 else None
                except Exception as e:
                    print(f"Error downloading config for {vpn_id}: {e}")
                    config_content = None
                vpn["config_content"] = config_content
                full_data.append(vpn)
            self.signals.vpnsFetched.emit(full_data)
            
        except Exception as e:
            print(f"VPN Fetch Error: {e}")

class VpnDeleter(QRunnable):
    def __init__(self, token, vpn_id, backend_signals):
        super().__init__()
        self.token = token
        self.vpn_id = vpn_id
        self.signals = backend_signals
        self.api_base = f"{VPN_URL}/{vpn_id}"

    def run(self):
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.delete(self.api_base, headers=headers, timeout=10)
            if resp.status_code == 200 or resp.status_code == 204:
                self.signals.vpnDeleted.emit(True)
            else:
                print(f"Failed to delete VPN: {resp.status_code}")
                self.signals.vpnDeleted.emit(False)
        except Exception as e:
            print(f"VPN Delete Error: {e}")
            self.signals.vpnDeleted.emit(False)

class Backend(QObject):
    loginSuccess = Signal(str, str, str)
    loginFailed = Signal(str)
    loginFileSaved = Signal()
    logout = Signal()
    authenticationFinished = Signal()
    rulesFetched = Signal(list)
    vpnsFetched = Signal(list)
    vpnDeleted = Signal(bool)
    
    def __init__(self, ws_client, daemon_client, parent=None):
        super().__init__(parent)
        self.ws_client = ws_client
        self.daemon_client = daemon_client
        self.thread_pool = QThreadPool.globalInstance()
        self.loginFileSaved.connect(self.checkSavedAuth)
        self.vpnDeleted.connect(self.handleVpnDeleted)
        self._current_token = None

    @Slot()
    def checkSavedAuth(self):
        self.thread_pool.start(AuthFileWorker(self))

    @Slot(str, str)
    def authenticate(self, user, password):
        self.thread_pool.start(AuthWorker(user, password, self))

    @Slot(str)
    def fetchRules(self, token):
        self._current_token = token
        self.thread_pool.start(FirewallRulesParser(token, self))
        self.thread_pool.start(VpnFetcher(token, self))

    @Slot(str)
    def deleteVpn(self, vpn_id):
        if self._current_token:
            self.thread_pool.start(VpnDeleter(self._current_token, vpn_id, self))
        else:
            print("Cannot delete VPN: No active token")

    @Slot()
    def handleVpnDeleted(self, success):
        if success:
            print("VPN deleted successfully, refreshing list...")
            if self._current_token:
                self.fetchRules(self._current_token)
    
    @Slot()
    def refreshData(self):
        if self._current_token:
            print("Refreshing data...")
            self.fetchRules(self._current_token)
        else:
            print("Cannot refresh: No active session")

    @Slot()
    def handleLogout(self):
        AUTH_FILE.unlink(missing_ok=True)
        self._current_token = None
        self.logout.emit()
        self.authenticationFinished.emit()

    @Slot(list)
    def saveRules(self, rules):
        if not self.daemon_client or not self.daemon_client.is_connected:
            print("Error: Socket not connected. Cannot save rules.")
            return

        print("Sending rules to socket...")
        self.daemon_client.send_command("iptables -F INPUT")
        
        for rule in rules:
            if not rule.get("rule_enabled"):
                continue
            action_map = {"ALLOW": "ACCEPT", "DENY": "REJECT", "DROP": "DROP"}
            target = action_map.get(rule.get("rule_action"), "DROP")
            raw_proto = rule.get("protocol", "TCP")
            proto = raw_proto.lower()
            s_ip = rule.get("ip_address", "0.0.0.0/0")
            port_flag = ""
            p_start = rule.get("port_start")
            p_end = rule.get("port_end")
            if p_start:
                if p_end and p_end != p_start:
                    port_flag = f"--dport {p_start}:{p_end} "
                else:
                    port_flag = f"--dport {p_start} "
            if proto in ["TCP", "BOTH"]:
                cmd = f"iptables -A INPUT -p TCP -s {s_ip} {port_flag}-j {target}"
                print(f"Sending: {cmd}")
                self.daemon_client.send_command(cmd)
            if proto in ["UPD", "BOTH"]:
                cmd = f"iptables -A INPUT -p UDP -s {s_ip} {port_flag}-j {target}"
                print(f"Sending: {cmd}")
                self.daemon_client.send_command(cmd)

if __name__ == "__main__":
    app = QGuiApplication(sys.argv)
    
    ws_client = NeosecWebSocketClient()
    daemon_client = NeosecDaemonClient()
    
    engine = QQmlApplicationEngine()
    backend = Backend(ws_client, daemon_client)
    firewall = Firewall()
    dashboard = DashboardBackend()
    vpn_manager = VpnManager()
    backend.rulesFetched.connect(firewall.update_rules)
    backend.vpnsFetched.connect(vpn_manager.update_vpns)
    firewall.saveRulesRequested.connect(backend.saveRules)
    backend.loginSuccess.connect(lambda e, r, token: backend.fetchRules(token))
    backend.loginSuccess.connect(lambda e, r, token: ws_client.connect(token))
    backend.loginSuccess.connect(lambda e, r, token: daemon_client.connect(token))
    engine.rootContext().setContextProperty("backend", backend)
    engine.rootContext().setContextProperty("dashboardBackend", dashboard)
    engine.rootContext().setContextProperty("vpnManager", vpn_manager)
    engine.rootContext().setContextProperty("signup_url", SIGNUP_URL)
    engine.rootContext().setContextProperty("firewall", firewall)
    qml_file = Path(__file__).parent / "neosec" / "qml" / "main.qml"
    engine.load(str(qml_file))
    if not engine.rootObjects():
        sys.exit(-1)
    backend.checkSavedAuth()
    sys.exit(app.exec())
