// Monitoring scripts for MicroPython devices as inline strings

export const systemMonitorScript = `
try:
    import gc
    import machine
    import time
    
    # Simple JSON serialization without json module
    free_mem = gc.mem_free()
    alloc_mem = gc.mem_alloc()
    freq = machine.freq()
    timestamp = time.time()
    
    # Try to get temperature
    temp_str = ""
    try:
        if hasattr(machine, 'temperature'):
            temp = machine.temperature()
            temp_str = ',"temp":' + str(temp)
    except:
        pass
        
    # Manual JSON construction to avoid json module dependency
    result = '{"memory":{"free":' + str(free_mem) + ',"allocated":' + str(alloc_mem) + '},"freq":' + str(freq) + ',"timestamp":' + str(timestamp) + temp_str + '}'
    print("__MONITOR_DATA__" + result)
except Exception as e:
    print("__MONITOR_DATA__" + '{"error":"' + str(e) + '","timestamp":0}')
`;

export const gpioMonitorScript = `
try:
    from machine import Pin
    
    pin_numbers = [2, 4, 5, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33]
    result_parts = []
    
    for pin_num in pin_numbers:
        try:
            pin = Pin(pin_num, Pin.IN)
            value = pin.value()
            result_parts.append('"pin_' + str(pin_num) + '":' + str(value))
        except:
            pass
    
    # Manual JSON construction
    result = "{" + ",".join(result_parts) + "}"
    print("__GPIO_STATE__" + result)
except Exception as e:
    print("__GPIO_STATE__" + '{"error":"' + str(e) + '"}')
`;

export const wifiScannerScript = `
try:
    import network
    
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    networks = wlan.scan()
    result_parts = []
    
    for net in networks:
        try:
            ssid = net[0].decode('utf-8') if net[0] else ''
            channel = net[2]
            rssi = net[3]
            security = net[4]
            
            # Simple security mapping
            sec_name = 'Open'
            if security == 1: sec_name = 'WEP'
            elif security == 2: sec_name = 'WPA-PSK'
            elif security == 3: sec_name = 'WPA2-PSK'
            elif security == 4: sec_name = 'WPA/WPA2-PSK'
            
            # Manual JSON construction for each network
            net_json = '{"ssid":"' + ssid + '","channel":' + str(channel) + ',"rssi":' + str(rssi) + ',"security":"' + sec_name + '"}'
            result_parts.append(net_json)
        except:
            pass
    
    result = "[" + ",".join(result_parts) + "]"
    print("__WIFI_SCAN__" + result)
except Exception as e:
    print("__WIFI_SCAN__" + '{"error":"' + str(e) + '"}')
`;

export const i2cScannerScript = `
try:
    from machine import I2C, Pin
    
    # Try different I2C configurations
    configs = [(0, 22, 21), (1, 25, 26)]
    found_devices = []
    
    for bus_id, scl, sda in configs:
        try:
            i2c = I2C(bus_id, scl=Pin(scl), sda=Pin(sda))
            devices = i2c.scan()
            
            for device in devices:
                if device not in found_devices:
                    found_devices.append(device)
        except:
            continue
    
    # Manual JSON array construction
    result_parts = [str(dev) for dev in found_devices]
    result = "[" + ",".join(result_parts) + "]"
    print("__I2C_DEVICES__" + result)
except Exception as e:
    print("__I2C_DEVICES__" + '{"error":"' + str(e) + '"}')
`;

export { testMonitoringScript } from './test_script';