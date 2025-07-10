import { useCallback } from 'react';
import { 
  SystemMetrics, 
  GPIOState, 
  WiFiNetwork, 
  I2CDevice, 
  ParsedMonitoringMessage 
} from '../types';

export const useMonitoringParser = () => {
  const parseMonitoringData = useCallback((line: string): ParsedMonitoringMessage | null => {
    try {
      // Parse system metrics
      const systemMatch = line.match(/__MONITOR_DATA__(.+)/);
      if (systemMatch) {
        const data = JSON.parse(systemMatch[1]) as SystemMetrics;
        return {
          type: 'MONITOR_DATA',
          data,
          timestamp: Date.now()
        };
      }

      // Parse GPIO state
      const gpioMatch = line.match(/__GPIO_STATE__(.+)/);
      if (gpioMatch) {
        const data = JSON.parse(gpioMatch[1]) as GPIOState;
        return {
          type: 'GPIO_STATE',
          data,
          timestamp: Date.now()
        };
      }

      // Parse WiFi scan results
      const wifiMatch = line.match(/__WIFI_SCAN__(.+)/);
      if (wifiMatch) {
        const data = JSON.parse(wifiMatch[1]) as WiFiNetwork[];
        return {
          type: 'WIFI_SCAN',
          data,
          timestamp: Date.now()
        };
      }

      // Parse I2C devices
      const i2cMatch = line.match(/__I2C_DEVICES__(.+)/);
      if (i2cMatch) {
        const devices = JSON.parse(i2cMatch[1]) as number[];
        const data: I2CDevice[] = devices.map(addr => ({
          address: addr,
          status: 'active' as const
        }));
        return {
          type: 'I2C_DEVICES',
          data,
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing monitoring data:', error);
      return null;
    }
  }, []);

  const isMonitoringData = useCallback((line: string): boolean => {
    return /__MONITOR_DATA__|__GPIO_STATE__|__WIFI_SCAN__|__I2C_DEVICES__/.test(line);
  }, []);

  const cleanLine = useCallback((line: string): string => {
    return line.replace(/__MONITOR_DATA__|__GPIO_STATE__|__WIFI_SCAN__|__I2C_DEVICES__.*/, '').trim();
  }, []);

  return {
    parseMonitoringData,
    isMonitoringData,
    cleanLine
  };
};