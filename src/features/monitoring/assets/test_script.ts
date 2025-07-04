export const testMonitoringScript = `
try:
    import json
    import time
    
    # Test data to verify monitoring is working
    test_data = {
        'memory': {'free': 123456, 'allocated': 78910},
        'freq': 240000000,
        'timestamp': time.time()
    }
    
    print("__MONITOR_DATA__" + json.dumps(test_data))
    
    # Test GPIO data
    gpio_test = {'pin_2': 1, 'pin_4': 0, 'pin_5': 1}
    print("__GPIO_STATE__" + json.dumps(gpio_test))
    
    # Test WiFi data
    wifi_test = [{'ssid': 'TestNetwork', 'rssi': -45, 'channel': 6, 'security': 'WPA2-PSK'}]
    print("__WIFI_SCAN__" + json.dumps(wifi_test))
    
    # Test I2C data
    i2c_test = [0x3C, 0x68]
    print("__I2C_DEVICES__" + json.dumps(i2c_test))
    
except Exception as e:
    print("Test error: " + str(e))
`;