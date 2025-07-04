export const testMonitoringScript = `
try:
    import time
    
    # Test system metrics with manual JSON construction
    timestamp = time.time()
    test_system = '{"memory":{"free":123456,"allocated":78910},"freq":240000000,"timestamp":' + str(timestamp) + '}'
    print("__MONITOR_DATA__" + test_system)
    
    # Test GPIO data
    test_gpio = '{"pin_2":1,"pin_4":0,"pin_5":1,"pin_16":0,"pin_17":1}'
    print("__GPIO_STATE__" + test_gpio)
    
    # Test WiFi data
    test_wifi = '[{"ssid":"TestNetwork","rssi":-45,"channel":6,"security":"WPA2-PSK"},{"ssid":"TestNetwork2","rssi":-67,"channel":11,"security":"Open"}]'
    print("__WIFI_SCAN__" + test_wifi)
    
    # Test I2C data
    test_i2c = '[60,104]'
    print("__I2C_DEVICES__" + test_i2c)
    
except Exception as e:
    print("Test error: " + str(e))
`;