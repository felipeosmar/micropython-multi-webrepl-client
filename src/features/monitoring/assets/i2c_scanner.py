# I2C Scanner Script for MicroPython
# Scans I2C bus for devices and sends results via marked output

import json
from machine import I2C, Pin

def scan_i2c_devices():
    """Scan I2C bus for devices"""
    try:
        # Common I2C configurations for ESP32
        i2c_configs = [
            {'id': 0, 'scl': 22, 'sda': 21},  # Default ESP32 I2C pins
            {'id': 1, 'scl': 25, 'sda': 26},  # Alternative I2C pins
        ]
        
        found_devices = []
        
        for config in i2c_configs:
            try:
                i2c = I2C(config['id'], scl=Pin(config['scl']), sda=Pin(config['sda']))
                devices = i2c.scan()
                
                for device in devices:
                    if device not in found_devices:
                        found_devices.append(device)
                        
            except Exception as e:
                # Skip if I2C bus can't be initialized
                continue
        
        return found_devices
    except Exception as e:
        return {'error': str(e)}

def send_i2c_scan():
    """Send I2C scan results with monitoring marker"""
    devices = scan_i2c_devices()
    print(f"__I2C_DEVICES__{json.dumps(devices)}")

# Execute I2C scanning
send_i2c_scan()