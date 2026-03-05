from PySide6.QtCore import QObject, Signal, Slot, QRunnable, QThreadPool
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtWidgets import QApplication
import sys
import os
import requests
import pathlib
import json
try:
    from socketio import Client as SocketIOClient
except (ImportError, AttributeError):
    raise ImportError(
        "python-socketio[client] is not installed or the wrong 'socketio' package is active.\n"
        "Run: pip install 'python-socketio[client]'\n"
        "If an old 'socketio' package is installed, uninstall it first: pip uninstall socketio"
    )

# ── URLs ──────────────────────────────────────────────────────────────────────
# Uses NEOSEC_SERVER env var if set (useful for local dev), otherwise production.
_base = os.environ.get("NEOSEC_SERVER", "http://localhost:5000")
signup_url        = "https://neosec-mauve.vercel.app/"
auth_url          = f"{_base}/api/auth/login"
verification_url  = f"{_base}/api/auth/verify"
socket_server_url = _base

# ── Paths ─────────────────────────────────────────────────────────────────────
base_dir = pathlib.Path(__file__).resolve().parent
main_qml = base_dir / "qml" / "main.qml"
data_dir = pathlib.Path.home() / ".local" / "share" / "neosec"
data_dir.mkdir(parents=True, exist_ok=True)
auth_file = data_dir / "auth.json"


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
# AuthFileWorker  –  verifies saved token on startup (REST), then connects socket
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
                        headers={"Authorization": f"Bearer {token}"},
                        timeout=10,
                    ).json()
                    if response.get("success"):
                        username = f"{response.get('email')} ({response.get('role')})"
                        self.signals.loginSuccess.emit(username)
                        # ── Connect socket after successful REST verification ──
                        worker = SocketWorker(token, self.signals)
                        self.signals._thread_pool.start(worker)
                        # authenticationFinished will be emitted by SocketWorker
                        return
                    else:
                        self.signals.loginFailed.emit("Authentication token expired")
                        auth_file.unlink(missing_ok=True)
            except Exception as e:
                print(f"AuthFileWorker error: {e}")
                self.signals.loginFailed.emit("Timed out trying to reach server.")

        self.signals.authenticationFinished.emit()


# ─────────────────────────────────────────────────────────────────────────────
# SocketWorker  –  connects to Socket.IO /desktop namespace, authenticates,
#                  then emits the profile back to the Qt main thread.
# ─────────────────────────────────────────────────────────────────────────────
class SocketWorker(QRunnable):
    def __init__(self, token, backend_signals, parent=None):
        super().__init__(parent)
        self.token = token
        self.signals = backend_signals

    def run(self):
        client = SocketIOClient(reconnection=True, reconnection_attempts=3, logger=False)

        @client.event(namespace="/desktop")
        def connect():
            print("[socket] Connected to server /desktop namespace")
            client.emit("authenticate", {"token": self.token}, namespace="/desktop")

        @client.on("auth_success", namespace="/desktop")
        def on_auth_success(data):
            print(f"[socket] auth_success received for {data.get('user', {}).get('email', '?')}")
            self.signals.profileReceived.emit(json.dumps(data))
            self.signals.authenticationFinished.emit()

        @client.on("auth_error", namespace="/desktop")
        def on_auth_error(data):
            msg = data.get("message", "Socket authentication failed")
            print(f"[socket] auth_error: {msg}")
            self.signals.socketError.emit(msg)
            self.signals.authenticationFinished.emit()
            try:
                client.disconnect()
            except Exception:
                pass

        @client.event(namespace="/desktop")
        def disconnect():
            print("[socket] Disconnected from server")

        try:
            client.connect(
                socket_server_url,
                namespaces=["/desktop"],
                transports=["websocket", "polling"],
                wait_timeout=15,
            )
            # Keep the worker alive while the socket is connected; disconnect on quit.
            self.signals._active_socket = client
            # Block until the socket disconnects
            client.wait()
        except Exception as e:
            print(f"[socket] Connection error: {e}")
            self.signals.socketError.emit(f"Could not connect to server socket: {e}")
            self.signals.authenticationFinished.emit()


# ─────────────────────────────────────────────────────────────────────────────
# Backend  –  QObject exposed to QML
# ─────────────────────────────────────────────────────────────────────────────
class Backend(QObject):
    loginSuccess          = Signal(str)       # username string
    loginFailed           = Signal(str)       # error message
    loginFileSaved        = Signal()
    logout                = Signal()
    authenticationFinished = Signal()

    # New signals for socket profile data
    profileReceived       = Signal(str)       # JSON string of full profile payload
    socketError           = Signal(str)       # socket-level error message

    def __init__(self, parent=None):
        super().__init__(parent)
        self._thread_pool = QThreadPool.globalInstance()
        self._active_socket = None            # holds the connected sio.Client
        self.loginFileSaved.connect(self.checkSavedAuth)

    @Slot()
    def checkSavedAuth(self):
        worker = AuthFileWorker(self)
        self._thread_pool.start(worker)

    @Slot(str, str)
    def authenticate(self, user, password):
        worker = AuthWorker(user, password, self)
        self._thread_pool.start(worker)

    @Slot(str)
    def connectSocket(self, token):
        """Called from QML after a fresh login to start the socket connection."""
        worker = SocketWorker(token, self)
        self._thread_pool.start(worker)

    @Slot(bool)
    def toggleVpn(self, enabled):
        """Tell the server to toggle VPN state in the active profile."""
        if self._active_socket and self._active_socket.connected:
            self._active_socket.emit(
                "vpn_toggle", {"enabled": enabled}, namespace="/desktop"
            )

    @Slot(bool)
    def toggleFirewall(self, enabled):
        """Tell the server to toggle firewall state in the active profile."""
        if self._active_socket and self._active_socket.connected:
            self._active_socket.emit(
                "firewall_toggle", {"enabled": enabled}, namespace="/desktop"
            )

    @Slot()
    def handleLogout(self):
        auth_file.unlink(missing_ok=True)
        if self._active_socket:
            try:
                self._active_socket.disconnect()
            except Exception:
                pass
            self._active_socket = None
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
