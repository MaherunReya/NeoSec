import json
import requests
from PySide6.QtCore import QRunnable
from .config import AUTH_FILE, AUTH_URL, VERIFICATION_URL

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
