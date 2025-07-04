import { useEffect, useRef, useCallback } from 'react';
import { systemMonitorScript, gpioMonitorScript, wifiScannerScript, i2cScannerScript } from '../assets';

interface AutoMonitoringConfig {
  enabled: boolean;
  interval: number; // in milliseconds
  enableSystemMetrics: boolean;
  enableGPIOMonitoring: boolean;
  enableWiFiScanning: boolean;
  enableI2CMonitoring: boolean;
}

export const useAutoMonitoring = (
  config: AutoMonitoringConfig,
  onSendCommand: (command: string) => void,
  isConnected: boolean
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const executeScript = useCallback((script: string) => {
    if (isConnected && onSendCommand) {
      console.log(`[AUTO MONITORING] Executing script: ${script.substring(0, 50)}...`);
      onSendCommand(`exec("""${script}""")`);
    }
  }, [isConnected, onSendCommand]);

  const startMonitoring = useCallback(() => {
    if (!config.enabled || !isConnected) return;

    intervalRef.current = setInterval(() => {
      if (config.enableSystemMetrics) {
        executeScript(systemMonitorScript);
      }
      
      // Stagger the execution to avoid overwhelming the device
      setTimeout(() => {
        if (config.enableGPIOMonitoring) {
          executeScript(gpioMonitorScript);
        }
      }, 500);

      setTimeout(() => {
        if (config.enableWiFiScanning) {
          executeScript(wifiScannerScript);
        }
      }, 1000);

      setTimeout(() => {
        if (config.enableI2CMonitoring) {
          executeScript(i2cScannerScript);
        }
      }, 1500);
    }, config.interval);
  }, [config, executeScript, isConnected]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (config.enabled && isConnected) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return stopMonitoring;
  }, [config.enabled, isConnected, startMonitoring, stopMonitoring]);

  return {
    startMonitoring,
    stopMonitoring,
    isRunning: intervalRef.current !== null
  };
};