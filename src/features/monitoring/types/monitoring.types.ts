export interface SystemMetrics {
  memory: {
    free: number;
    allocated: number;
  };
  freq: number;
  temp?: number;
  timestamp: number;
}

export interface GPIOState {
  [key: string]: number;
}

export interface WiFiNetwork {
  ssid: string;
  rssi: number;
  channel?: number;
  security?: string;
}

export interface I2CDevice {
  address: number;
  status: 'active' | 'inactive' | 'error';
}

export interface MonitoringData {
  systemMetrics?: SystemMetrics;
  gpioState?: GPIOState;
  wifiNetworks?: WiFiNetwork[];
  i2cDevices?: I2CDevice[];
  lastUpdated: number;
}

export interface MonitoringConfig {
  enableSystemMonitoring: boolean;
  enableGPIOMonitoring: boolean;
  enableWiFiScanning: boolean;
  enableI2CMonitoring: boolean;
  updateInterval: number;
  gpioPins: number[];
}

export type MonitoringDataType = 'MONITOR_DATA' | 'GPIO_STATE' | 'WIFI_SCAN' | 'I2C_DEVICES';

export interface ParsedMonitoringMessage {
  type: MonitoringDataType;
  data: any;
  timestamp: number;
}