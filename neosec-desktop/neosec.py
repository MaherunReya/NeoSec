from PySide6.QtCore import QObject, Signal, Slot, QRunnable, QThreadPool
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtWidgets import QApplication
import sys
import os
import requests
import pathlib
import json

# ── URLs ──────────────────────────────────────────────────────────────────────
# Set NEOSEC_SERVER env var to point at a local dev server, e.g. http://localhost:5000
_base = os.environ.get("NEOSEC_SERVER", "http://localhost:5000")
signup_url        = "https://neosec-mauve.vercel.app/"
auth_url          = f"{_base}/api/auth/login"
verification_url  = f"{_base}/api/auth/verify"
profiles_url      = f"{_base}/api/profiles"
vpn_url           = f"{_base}/api/vpn"
firewall_url      = f"{_base}/api/firewall"

# ── Paths ─────────────────────────────────────────────────────────────────────
base_dir = pathlib.Path(__file__).resolve().parent
main_qml = base_dir / "qml" / "main.qml"
data_dir = pathlib.Path.home() / ".local" / "share" / "neosec"
data_dir.mkdir(parents=True, exist_ok=True)
auth_file = data_dir / "auth.json"


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# AuthWorker  –  handles username/password login (REST)
# ─────────────────────────────────────────────────────────────────────────────
class AuthWorker(QRunnable):
    def __init__(self, user, password, backend_signals, parent=None):
        super().__init__(parent)
        self.user = user
        self.password = password
        self.signals = backend_signals

    def run(self):
        if self.user and self.password:
            try:
                auth_file.unlink(missing_ok=True)
                resp = requests.post(
                    auth_url,
                    data={"email": self.user, "password": self.password},
                    timeout=10,
                ).json()
                message = resp.get("message")
                if resp.get("success"):
                    auth_file.write_text(json.dumps(resp, indent=4))
                    self.signals.loginFileSaved.emit()
                else:
                    self.signals.loginFailed.emit(message)
            except Exception as e:
                print(f"AuthWorker error: {e}")
                self.signals.loginFailed.emit("Timed out trying to reach server.")
        else:
            self.signals.loginFailed.emit("Please enter valid email and password")
        self.signals.authenticationFinished.emit()


# ─────────────────────────────────────────────────────────────────────────────
# AuthFileWorker  –  verifies saved token on startup (REST), then fetches profile
# ─────────────────────────────────────────────────────────────────────────────
class AuthFileWorker(QRunnable):
    def __init__(self, backend_signals, parent=None):
        super().__init__(parent)
        self.signals = backend_signals

    def run(self):
        if auth_file.exists():
            try:
                auth_data = json.loads(auth_file.read_text())
                token = auth_data.get("token")
                if token:
                    response = requests.get(
                        verification_url,
                        headers=_auth_headers(token),
                        timeout=10,
                    ).json()
                    if response.get("success"):
                        username = f"{response.get('email')} ({response.get('role')})"
                        self.signals.loginSuccess.emit(username)
                        # Fetch profile data in a separate worker
                        worker = ProfileFetchWorker(token, self.signals)
                        self.signals._thread_pool.start(worker)
                        # authenticationFinished is emitted by ProfileFetchWorker
                        return
                    else:
                        self.signals.loginFailed.emit("Authentication token expired")
                        auth_file.unlink(missing_ok=True)
            except Exception as e:
                print(f"AuthFileWorker error: {e}")
                self.signals.loginFailed.emit("Timed out trying to reach server.")

        self.signals.authenticationFinished.emit()


# ─────────────────────────────────────────────────────────────────────────────
# ProfileFetchWorker  –  fetches profile + VPN configs + firewall rules via REST
#                        then emits the data back to the Qt main thread.
#                        No external socket library required — uses only `requests`.
# ─────────────────────────────────────────────────────────────────────────────
class ProfileFetchWorker(QRunnable):
    def __init__(self, token, backend_signals, parent=None):
        super().__init__(parent)
        self.token = token
        self.signals = backend_signals

    def run(self):
        headers = _auth_headers(self.token)
        try:
            # 1. Fetch all profiles, find the active one
            profiles_resp = requests.get(profiles_url, headers=headers, timeout=10).json()
            profiles = profiles_resp.get("profiles", profiles_resp.get("data", []))
            active_profile = next(
                (p for p in profiles if p.get("isActive")), None
            )

            # 2. Fetch VPN configs
            vpn_resp = requests.get(vpn_url, headers=headers, timeout=10).json()
            vpn_configs = vpn_resp.get("vpnConfigs", vpn_resp.get("data", []))

            # 3. Fetch firewall rules
            fw_resp = requests.get(firewall_url, headers=headers, timeout=10).json()
            firewall_rules = fw_resp.get("rules", fw_resp.get("data", []))

            # 4. Read user info from saved auth file
            try:
                auth_data = json.loads(auth_file.read_text())
                user = auth_data.get("user") or {
                    "email": auth_data.get("email", ""),
                    "role": auth_data.get("role", "user"),
                    "subscriptionTier": auth_data.get("subscriptionTier", "free"),
                }
            except Exception:
                user = {}

            payload = {
                "user": user,
                "profile": active_profile,
                "vpnConfigs": vpn_configs,
                "firewallRules": firewall_rules,
            }

            print(f"[profile] Fetched profile: {active_profile.get('name') if active_profile else 'none'}, "
                  f"{len(vpn_configs)} VPN config(s), {len(firewall_rules)} firewall rule(s)")

            self.signals.profileReceived.emit(json.dumps(payload))

        except Exception as e:
            print(f"ProfileFetchWorker error: {e}")
            self.signals.socketError.emit(f"Could not load profile: {e}")

        self.signals.authenticationFinished.emit()


# ─────────────────────────────────────────────────────────────────────────────
# ToggleWorker  –  sends a REST update to toggle VPN or firewall in the active profile
# ─────────────────────────────────────────────────────────────────────────────
class ToggleWorker(QRunnable):
    def __init__(self, token, profile_id, field, value, backend_signals, parent=None):
        super().__init__(parent)
        self.token = token
        self.profile_id = profile_id
        self.field = field
        self.value = value
        self.signals = backend_signals

    def run(self):
        if not self.profile_id:
            print(f"[toggle] No active profile ID — cannot toggle {self.field}")
            return
        url = f"{profiles_url}/{self.profile_id}"
        try:
            resp = requests.put(
                url,
                json={self.field: self.value},
                headers=_auth_headers(self.token),
                timeout=10,
            ).json()
            if resp.get("success"):
                print(f"[toggle] {self.field} set to {self.value} OK")
            else:
                print(f"[toggle] Server rejected toggle: {resp.get('message')}")
        except Exception as e:
            print(f"[toggle] Error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Backend  –  QObject exposed to QML
# ─────────────────────────────────────────────────────────────────────────────
class Backend(QObject):
    loginSuccess           = Signal(str)   # username string
    loginFailed            = Signal(str)   # error message
    loginFileSaved         = Signal()
    logout                 = Signal()
    authenticationFinished = Signal()

    # Profile data pushed after REST fetch
    profileReceived        = Signal(str)   # JSON string of full profile payload
    socketError            = Signal(str)   # error message

    def __init__(self, parent=None):
        super().__init__(parent)
        self._thread_pool  = QThreadPool.globalInstance()
        self._token        = None          # saved after login/verify
        self._active_profile_id = None    # cached for toggle calls
        self.loginFileSaved.connect(self.checkSavedAuth)
        self.profileReceived.connect(self._cache_profile_id)

    @Slot(str)
    def _cache_profile_id(self, profile_json):
        """Cache the active profile ID so toggle calls can reference it."""
        try:
            data = json.loads(profile_json)
            profile = data.get("profile")
            self._active_profile_id = profile.get("id") if profile else None
            print(f"[backend] Active profile ID cached: {self._active_profile_id}")
        except Exception:
            pass

    def _get_token(self):
        """Read token from saved auth file."""
        try:
            if auth_file.exists():
                return json.loads(auth_file.read_text()).get("token")
        except Exception:
            pass
        return None

    @Slot()
    def checkSavedAuth(self):
        worker = AuthFileWorker(self)
        self._thread_pool.start(worker)

    @Slot(str, str)
    def authenticate(self, user, password):
        worker = AuthWorker(user, password, self)
        self._thread_pool.start(worker)

    @Slot(bool)
    def toggleVpn(self, enabled):
        """PUT active profile with vpnEnabled=enabled."""
        token = self._get_token()
        if not token:
            print("[toggle] No token — cannot toggle VPN")
            return
        worker = ToggleWorker(token, self._active_profile_id, "vpnEnabled", enabled, self)
        self._thread_pool.start(worker)

    @Slot(bool)
    def toggleFirewall(self, enabled):
        """PUT active profile with firewallEnabled=enabled."""
        token = self._get_token()
        if not token:
            print("[toggle] No token — cannot toggle Firewall")
            return
        worker = ToggleWorker(token, self._active_profile_id, "firewallEnabled", enabled, self)
        self._thread_pool.start(worker)

    @Slot()
    def handleLogout(self):
        self._token = None
        self._active_profile_id = None
        auth_file.unlink(missing_ok=True)
        self.logout.emit()
        self.authenticationFinished.emit()


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
app = QApplication(sys.argv)
backend = Backend()
engine = QQmlApplicationEngine()
engine.rootContext().setContextProperty("backend", backend)
engine.rootContext().setContextProperty("signup_url", signup_url)
engine.load(str(main_qml))
if not engine.rootObjects():
    sys.exit(-1)
backend.checkSavedAuth()
sys.exit(app.exec())
