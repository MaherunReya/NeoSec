from pathlib import Path

BACKEND_URL = "https://neosec.linuxis.fun/api"
SIGNUP_URL = "https://neosec.linuxis.fun"

AUTH_FILE = Path.home() / ".local/share/neosec/auth.json"
AUTH_FILE.parent.mkdir(parents=True, exist_ok=True)

AUTH_URL = f"{BACKEND_URL}/auth/login"
VERIFICATION_URL = f"{BACKEND_URL}/auth/verify"
FIREWALL_URL = f"{BACKEND_URL}/firewall"
VPN_URL = f"{BACKEND_URL}/vpn"
VPN_DIR = Path.home() / ".local/share/neosec/vpns/"
SOCKET_PATH = "/tmp/neosec.sock"
IP_INFO_URL = "http://ip-api.com/json/"
VPN_METADATA_FILE = VPN_DIR / "vpns.json"