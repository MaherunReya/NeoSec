import time
import requests
import platform
from PySide6.QtCore import QObject, Signal, Slot, QRunnable, QThreadPool
from .config import IP_INFO_URL

class IpInfoWorker(QRunnable):
    def __init__(self, signals):
        super().__init__()
        self.signals = signals

    def run(self):
        try:
            ip_data = {}
            for attempt in range(3):
                try:
                    resp = requests.get(IP_INFO_URL, timeout=5)
                    if resp.status_code == 200:
                        ip_data = resp.json()
                        break
                except requests.exceptions.RequestException:
                    if attempt < 2:
                        time.sleep(1) 
                    continue
            
            system_info = {
                "os": f"{platform.system()} {platform.release()}",
                "node": platform.node()
            }
            
            full_data = {**ip_data, **system_info}
            self.signals.ipInfoReady.emit(full_data)
            
        except Exception as e:
            print(f"Failed to fetch IP info: {e}")
            self.signals.ipInfoReady.emit({})

class NetworkMonitorWorker(QRunnable):
    def __init__(self, signals):
        super().__init__()
        self.signals = signals
        self._running = True

    def stop(self):
        self._running = False

    def run(self):
        last_time = time.time()
        
        last_rx, last_tx = self._read_proc_net_dev()
        
        while self._running:
            time.sleep(1)
            if not self._running:
                break
                
            current_time = time.time()
            rx, tx = self._read_proc_net_dev()
            
            elapsed = current_time - last_time
            if elapsed > 0:
                rx_speed = (rx - last_rx) / elapsed
                tx_speed = (tx - last_tx) / elapsed
                
                self.signals.networkSpeedUpdate.emit(
                    self._format_speed(rx_speed),
                    self._format_speed(tx_speed)
                )
                
                last_rx = rx
                last_tx = tx
                last_time = current_time

    def _read_proc_net_dev(self):
        total_rx = 0
        total_tx = 0
        try:
            with open("/proc/net/dev", "r") as f:
                lines = f.readlines()[2:] 
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 10:
                        try:
                            total_rx += int(parts[1])
                            total_tx += int(parts[9])
                        except ValueError:
                            pass
        except Exception as e:
            print(f"Error reading network stats: {e}")
        return total_rx, total_tx

    def _format_speed(self, bytes_per_sec):
        if bytes_per_sec < 1024:
            return f"{bytes_per_sec:.1f} B/s"
        elif bytes_per_sec < 1024 * 1024:
            return f"{bytes_per_sec/1024:.1f} KB/s"
        else:
            return f"{bytes_per_sec/(1024*1024):.1f} MB/s"

import subprocess

class VpnStatusWorker(QRunnable):
    def __init__(self, signals):
        super().__init__()
        self.signals = signals
    
    def run(self):
        try:
            proc = subprocess.run(
                ["nmcli", "-t", "-f", "TYPE,STATE", "connection", "show", "--active"],
                capture_output=True,
                text=True
            )
            
            is_connected = False
            if proc.returncode == 0:
                for line in proc.stdout.splitlines():
                    if "vpn" in line or "wireguard" in line or "tun" in line:
                        if "activated" in line:
                            is_connected = True
                            break
            
            self.signals.vpnStatusReady.emit(is_connected)
            
        except Exception:
            self.signals.vpnStatusReady.emit(False)

class DashboardBackend(QObject):
    ipInfoReady = Signal(dict)
    networkSpeedUpdate = Signal(str, str)
    vpnStatusReady = Signal(bool)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.thread_pool = QThreadPool.globalInstance()
        self._monitor_worker = None

    @Slot()
    def checkVpnStatus(self):
        worker = VpnStatusWorker(self)
        self.thread_pool.start(worker)

    @Slot()
    def fetchIpInfo(self):
        worker = IpInfoWorker(self)
        self.thread_pool.start(worker)

    @Slot()
    def startNetworkMonitor(self):
        if self._monitor_worker is None:
            self._monitor_worker = NetworkMonitorWorker(self)
            self._monitor_worker.setAutoDelete(True) 
            self.thread_pool.start(self._monitor_worker)

    @Slot()
    def stopNetworkMonitor(self):
        if self._monitor_worker:
            self._monitor_worker.stop()
            self._monitor_worker = None
