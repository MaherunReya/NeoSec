from pathlib import Path

BACKEND_URL = "http://localhost:5000"
SIGNUP_URL = "http://localhost:3000"
AUTH_FILE = Path.home() / ".local/share/neosec/auth.json"
AUTH_FILE.parent.mkdir(parents=True, exist_ok=True)
AUTH_URL = f"{BACKEND_URL}/api/auth/login"
VERIFICATION_URL = f"{BACKEND_URL}/api/auth/verify"
FIREWALL_URL = f"{BACKEND_URL}/api/firewall"
VPN_API_BASE = "http://localhost:5000/api/vpn"
VPN_DIR = Path.home() / ".local/share/neosec/vpns/"
SOCKET_PATH = "/tmp/neosec.sock"
IP_INFO_URL = "http://ip-api.com/json/"
VPN_METADATA_FILE = VPN_DIR / "vpns.json"