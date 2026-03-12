#!/bin/bash

# Neosec Uninstallation Script
# This script reverses the installation of the Neosec application and services.

set -e

# Configuration
INSTALL_DIR="/opt/neosec"
SERVICE_NAME="neosec-daemon"

# 1. Check for root privileges
if [[ $EUID -ne 0 ]]; then
   echo "Error: This script must be run with sudo to remove the services and files."
   exit 1
fi

# Get the real user who invoked sudo
REAL_USER=${SUDO_USER:-$USER}
REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)
AUTOSTART_FILE="$REAL_HOME/.config/autostart/neosec.desktop"
USER_DATA_DIR="$REAL_HOME/.local/share/neosec"

echo "--- Neosec Uninstallation ---"

# 2. Stop and Disable Systemd Service
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "Stopping $SERVICE_NAME..."
    systemctl stop $SERVICE_NAME
fi

if systemctl is-enabled --quiet $SERVICE_NAME; then
    echo "Disabling $SERVICE_NAME..."
    systemctl disable $SERVICE_NAME
fi

# 3. Remove Systemd Service File
if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
    echo "Removing systemd service file..."
    rm "/etc/systemd/system/$SERVICE_NAME.service"
    systemctl daemon-reload
fi

# 4. Remove Desktop Autostart File
if [ -f "$AUTOSTART_FILE" ]; then
    echo "Removing GUI autostart entry: $AUTOSTART_FILE"
    rm "$AUTOSTART_FILE"
fi

# 4.2 Remove System-wide Desktop Entry
if [ -f "/usr/share/applications/neosec.desktop" ]; then
    echo "Removing system-wide desktop entry..."
    rm "/usr/share/applications/neosec.desktop"
fi

# 4.3 Remove CLI Binary
if [ -f "/usr/local/bin/neosec" ]; then
    echo "Removing CLI binary: /usr/local/bin/neosec"
    rm "/usr/local/bin/neosec"
fi

# 5. Remove Installation Directory
if [ -d "$INSTALL_DIR" ]; then
    echo "Removing installation directory: $INSTALL_DIR"
    rm -rf "$INSTALL_DIR"
fi

# 6. Remove User Data Files
if [ -d "$USER_DATA_DIR" ]; then
    echo "Removing user data directory: $USER_DATA_DIR"
    rm -rf "$USER_DATA_DIR"
fi

echo "--- Uninstallation Complete ---"
echo "Neosec has been successfully removed from your system."
