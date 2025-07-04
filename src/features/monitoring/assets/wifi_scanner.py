# WiFi Scanner Script for MicroPython
# Scans for available WiFi networks and sends results via marked output

import json
import network

def scan_wifi_networks():
    """Scan for available WiFi networks"""
    try:
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        
        # Scan for networks
        networks = wlan.scan()
        
        # Format results
        network_list = []
        for net in networks:
            ssid = net[0].decode('utf-8') if net[0] else ''
            bssid = ':'.join(['%02x' % b for b in net[1]])
            channel = net[2]
            rssi = net[3]
            security = net[4]
            
            # Map security types
            security_map = {
                0: 'Open',
                1: 'WEP',
                2: 'WPA-PSK',
                3: 'WPA2-PSK',
                4: 'WPA/WPA2-PSK'
            }
            
            network_list.append({
                'ssid': ssid,
                'bssid': bssid,
                'channel': channel,
                'rssi': rssi,
                'security': security_map.get(security, 'Unknown')
            })
        
        return network_list
    except Exception as e:
        return {'error': str(e)}

def send_wifi_scan():
    """Send WiFi scan results with monitoring marker"""
    networks = scan_wifi_networks()
    print(f"__WIFI_SCAN__{json.dumps(networks)}")

# Execute WiFi scanning
send_wifi_scan()