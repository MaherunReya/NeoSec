
from neosec.firewall import Firewall
from PySide6.QtCore import QModelIndex

def test_filtering():
    # Mock data
    rules = [
        {"ip_address": "192.168.1.1", "port_start": "80", "port_end": "80", "rule_enabled": True},
        {"ip_address": "10.0.0.1", "port_start": "22", "port_end": "22", "rule_enabled": False},
        {"ip_address": "192.168.1.2", "port_start": "443", "port_end": "443", "rule_enabled": True},
        {"ip_address": "172.16.0.5", "port_start": "8080", "port_end": "8080", "rule_enabled": False},
    ]
    
    fw = Firewall(rules)
    
    # Test 1: Initial State (All rules)
    assert fw.rowCount() == 4, f"Expected 4 rows, got {fw.rowCount()}"
    print("Test 1: Initial state passed")
    
    # Test 2: Filter by Enabled
    fw.set_filter_type("ENABLED")
    assert fw.rowCount() == 2, f"Expected 2 rows (enabled), got {fw.rowCount()}"
    # Verify content
    idx0 = fw.index(0, 0)
    # Updated test to pass role ID instead of role value
    roles = fw.roleNames()
    role_ids = list(roles.keys())
    assert fw.data(idx0, role_ids[0])
    ip_role = [k for k,v in fw.roleNames().items() if v == b"ip_address"][0]
    ips = [fw.data(fw.index(i,0), ip_role) for i in range(fw.rowCount())]
    assert "192.168.1.1" in ips and "192.168.1.2" in ips
    print("Test 2: Filter by ENABLED passed")

    # Test 3: Filter by Text (IP)
    fw.set_filter_type("ALL") # Reset type
    fw.set_filter_text("192.168")
    assert fw.rowCount() == 2, f"Expected 2 rows for '192.168', got {fw.rowCount()}"
    print("Test 3: Filter by Text (IP) passed")
    
    # Test 4: Filter by Text (Port)
    fw.set_filter_text("80") # Should match 80 and 8080
    assert fw.rowCount() == 2, f"Expected 2 rows for '80' (80, 8080), got {fw.rowCount()}"
    print("Test 4: Filter by Text (Port) passed")

    # Test 5: Combined Filter
    fw.set_filter_type("DISABLED")
    fw.set_filter_text("80") # Should match 8080 (disabled)
    assert fw.rowCount() == 1, f"Expected 1 row for DISABLED + '80', got {fw.rowCount()}"
    ips = [fw.data(fw.index(i,0), ip_role) for i in range(fw.rowCount())]
    assert "172.16.0.5" in ips
    print("Test 5: Combined Filter passed")
    
    # Test 6: Toggle Selection while filtered
    # Current view: 172.16.0.5 (Disabled)
    # If we toggle it, it becomes Enabled. Since we filter by DISABLED, it should disappear.
    fw.toggle_selection(0) 
    assert fw.rowCount() == 0, f"Expected 0 rows after toggling the only item to enabled, got {fw.rowCount()}"
    
    # Verify it changed in the main list
    fw.set_filter_type("ALL")
    fw.set_filter_text("")
    count_enabled = fw.activeRuleCount
    assert count_enabled == 3, f"Expected 3 enabled rules now, got {count_enabled}"
    print("Test 6: Toggle logic passed")

if __name__ == "__main__":
    test_filtering()
