#!/bin/bash

# Neosec Installation & Autostart Setup Script
# This script installs the Neosec desktop package to /opt/neosec,
# creates a Python virtual environment, installs dependencies,
# sets up the neosec-daemon as a systemd service, 
# and configures the desktop app to autostart on login.

set -e

# Configuration
INSTALL_DIR="/opt/neosec"
VENV_DIR="$INSTALL_DIR/venv"
SERVICE_NAME="neosec-daemon"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1. Check for root privileges
if [[ $EUID -ne 0 ]]; then
   echo "Error: This script must be run with sudo."
   exit 1
fi

# Get the real user who invoked sudo
REAL_USER=${SUDO_USER:-$USER}
REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)
AUTOSTART_DIR="$REAL_HOME/.config/autostart"

echo "--- Neosec Installation ---"

# 2. System Dependency Checks
echo "Checking system dependencies..."

MISSING_DEPS=()

# Check for Systemd
if ! command -v systemctl >/dev/null 2>&1; then
    MISSING_DEPS+=("systemd")
fi

# Check for NetworkManager (nmcli)
if ! command -v nmcli >/dev/null 2>&1; then
    MISSING_DEPS+=("network-manager (nmcli)")
fi

# Check for iptables
if ! command -v iptables >/dev/null 2>&1; then
    MISSING_DEPS+=("iptables")
fi

# Check for Python 3
if ! command -v python3 >/dev/null 2>&1; then
    MISSING_DEPS+=("python3")
fi

# Check for Python venv module
if ! python3 -m venv --help >/dev/null 2>&1; then
    MISSING_DEPS+=("python3-venv")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo "Error: Missing critical system dependencies:"
    for dep in "${MISSING_DEPS[@]}"; do
        echo "  - $dep"
    done
    echo ""
    echo "Please install them using your package manager:"
    
    # Distribution-specific installation hints
    if [ -f /etc/debian_version ]; then
        echo "  Ubuntu/Debian: sudo apt update && sudo apt install network-manager iptables python3 python3-venv"
    elif [ -f /etc/fedora-release ]; then
        echo "  Fedora:        sudo dnf install NetworkManager iptables-services python3"
    elif [ -f /etc/arch-release ]; then
        echo "  Arch/Manjaro:  sudo pacman -S networkmanager iptables python"
    else
        echo "  Please consult your distribution's documentation to install the missing tools."
    fi
    exit 1
fi

echo "All system dependencies found."

# 3. Create installation directory and copy entire package
echo "Installing to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cp -r "$SOURCE_DIR/." "$INSTALL_DIR/"

# Ensure the main python files are executable
chmod +x "$INSTALL_DIR/daemon.py"
chmod +x "$INSTALL_DIR/main.py"

# 4. Create Virtual Environment
echo "Creating Python virtual environment in $VENV_DIR..."

VENV_OPTS=""
# Optimization: Check if PySide6 is already installed on the system to avoid large downloads
if python3 -c "import PySide6" 2>/dev/null; then
    echo "✅ Found system-wide PySide6. Using --system-site-packages to avoid extra downloads."
    VENV_OPTS="--system-site-packages"
else
    echo "💡 System-wide PySide6 not found. Will install pyside6-essentials (approx. 70MB) into venv."
fi

python3 -m venv $VENV_OPTS "$VENV_DIR"

# 5. Install Python Dependencies into venv
if [ -f "$INSTALL_DIR/requirements.txt" ]; then
    echo "Installing Python dependencies into virtual environment..."
    "$VENV_DIR/bin/pip" install --upgrade pip
    
    # If using system site packages, we might still need other dependencies from requirements.txt
    "$VENV_DIR/bin/pip" install -r "$INSTALL_DIR/requirements.txt"
else
    echo "Warning: requirements.txt not found. Skipping dependency installation."
fi

# 6. Create Systemd Service File
echo "Creating systemd service: $SERVICE_NAME..."
cat <<EOF > /etc/systemd/system/$SERVICE_NAME.service
[Unit]
Description=Neosec Security Daemon
After=network.target

[Service]
ExecStart=$VENV_DIR/bin/python3 $INSTALL_DIR/daemon.py
Restart=always
User=root
WorkingDirectory=$INSTALL_DIR
Environment=PYTHONPATH=$INSTALL_DIR
Environment=HOME=$REAL_HOME

[Install]
WantedBy=multi-user.target
EOF

# 7. Reload systemd and start service
echo "Starting $SERVICE_NAME..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME

# 8. Setup Desktop Autostart (XDG)
echo "Configuring GUI autostart for $REAL_USER..."
su - "$REAL_USER" -c "mkdir -p $AUTOSTART_DIR"

cat <<EOF > "$REAL_HOME/.config/autostart/neosec.desktop"
[Desktop Entry]
Type=Application
Exec=$VENV_DIR/bin/python3 $INSTALL_DIR/main.py
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=Neosec
Comment=Neosec Security Desktop Client
Path=$INSTALL_DIR
EOF

# Ensure correct ownership of the autostart file
chown "$REAL_USER:$REAL_USER" "$REAL_HOME/.config/autostart/neosec.desktop"

# 8.2 Create System-wide Desktop Entry (for launchers like dmenu)
echo "Creating system-wide desktop entry..."
cat <<EOF > /usr/share/applications/neosec.desktop
[Desktop Entry]
Type=Application
Exec=$VENV_DIR/bin/python3 $INSTALL_DIR/main.py
Icon=security-high
Name=Neosec
Comment=Neosec Security Desktop Client
Categories=Security;System;
Terminal=false
Path=$INSTALL_DIR
EOF
chmod 644 /usr/share/applications/neosec.desktop

# 9. Fix permissions for the user's config directory
# (It might have been created by the daemon as root)
USER_CONFIG_DIR="$REAL_HOME/.local/share/neosec"
if [ -d "$USER_CONFIG_DIR" ]; then
    echo "Fixing permissions for $USER_CONFIG_DIR..."
    chown -R "$REAL_USER:$REAL_USER" "$USER_CONFIG_DIR"
fi

echo "--- Installation Complete ---"
echo "Daemon Status:"
systemctl status $SERVICE_NAME --no-pager
echo ""
echo "Application installed at: $INSTALL_DIR"
echo "Virtual environment:      $VENV_DIR"
echo "Autostart entry created at: $REAL_HOME/.config/autostart/neosec.desktop"
echo "Please restart your session or reboot to verify the GUI autostart."
