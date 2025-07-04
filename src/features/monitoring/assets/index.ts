// Monitoring scripts for MicroPython devices as inline strings

export const systemMonitorScript = `
try:
    import gc
    import machine
    import time
    import json
    
    metrics = {
        'memory': {
            'free': gc.mem_free(),
            'allocated': gc.mem_alloc()
        },
        'freq': machine.freq(),
        'timestamp': time.time()
    }
    
    try:
        if hasattr(machine, 'temperature'):
            metrics['temp'] = machine.temperature()
    except:
        pass
        
    print("__MONITOR_DATA__" + json.dumps(metrics))
except Exception as e:
    print("__MONITOR_DATA__" + json.dumps({"error": str(e), "timestamp": time.time() if 'time' in globals() else 0}))
`;

export const gpioMonitorScript = `
try:
    import json
    from machine import Pin
    
    pin_numbers = [2, 4, 5, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33]
    states = {}
    
    for pin_num in pin_numbers:
        try:
            pin = Pin(pin_num, Pin.IN)
            states['pin_' + str(pin_num)] = pin.value()
        except:
            pass
    
    print("__GPIO_STATE__" + json.dumps(states))
except Exception as e:
    print("__GPIO_STATE__" + json.dumps({"error": str(e)}))
`;

export const wifiScannerScript = `
try:
    import json
    import network
    
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    networks = wlan.scan()
    network_list = []
    
    for net in networks:
        try:
            ssid = net[0].decode('utf-8') if net[0] else ''
            bssid = ':'.join(['%02x' % b for b in net[1]])
            channel = net[2]
            rssi = net[3]
            security = net[4]
            
            security_map = {0: 'Open', 1: 'WEP', 2: 'WPA-PSK', 3: 'WPA2-PSK', 4: 'WPA/WPA2-PSK'}
            
            network_list.append({
                'ssid': ssid,
                'bssid': bssid,
                'channel': channel,
                'rssi': rssi,
                'security': security_map.get(security, 'Unknown')
            })
        except:
            pass
    
    print("__WIFI_SCAN__" + json.dumps(network_list))
except Exception as e:
    print("__WIFI_SCAN__" + json.dumps({"error": str(e)}))
`;

export const i2cScannerScript = `
try:
    import json
    from machine import I2C, Pin
    
    i2c_configs = [
        {'id': 0, 'scl': 22, 'sda': 21},
        {'id': 1, 'scl': 25, 'sda': 26},
    ]
    
    found_devices = []
    
    for config in i2c_configs:
        try:
            i2c = I2C(config['id'], scl=Pin(config['scl']), sda=Pin(config['sda']))
            devices = i2c.scan()
            
            for device in devices:
                if device not in found_devices:
                    found_devices.append(device)
        except:
            continue
    
    print("__I2C_DEVICES__" + json.dumps(found_devices))
except Exception as e:
    print("__I2C_DEVICES__" + json.dumps({"error": str(e)}))
`;

export { testMonitoringScript } from './test_script';