import { useState, useCallback } from 'react';
import { MonitoringData, SystemMetrics, GPIOState, WiFiNetwork, I2CDevice } from '../types';

export const useMonitoringData = () => {
  const [monitoringData, setMonitoringData] = useState<MonitoringData>({
    lastUpdated: 0
  });

  const updateSystemMetrics = useCallback((metrics: SystemMetrics) => {
    setMonitoringData(prev => ({
      ...prev,
      systemMetrics: metrics,
      lastUpdated: Date.now()
    }));
  }, []);

  const updateGPIOState = useCallback((state: GPIOState) => {
    setMonitoringData(prev => ({
      ...prev,
      gpioState: state,
      lastUpdated: Date.now()
    }));
  }, []);

  const updateWiFiNetworks = useCallback((networks: WiFiNetwork[]) => {
    setMonitoringData(prev => ({
      ...prev,
      wifiNetworks: networks,
      lastUpdated: Date.now()
    }));
  }, []);

  const updateI2CDevices = useCallback((devices: I2CDevice[]) => {
    setMonitoringData(prev => ({
      ...prev,
      i2cDevices: devices,
      lastUpdated: Date.now()
    }));
  }, []);

  const clearMonitoringData = useCallback(() => {
    setMonitoringData({
      lastUpdated: 0
    });
  }, []);

  return {
    monitoringData,
    updateSystemMetrics,
    updateGPIOState,
    updateWiFiNetworks,
    updateI2CDevices,
    clearMonitoringData
  };
};