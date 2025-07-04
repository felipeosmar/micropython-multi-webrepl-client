import React, { useState } from 'react';
import { MonitoringData } from '../types';
import { systemMonitorScript, gpioMonitorScript, wifiScannerScript, i2cScannerScript, testMonitoringScript } from '../assets';
import { useAutoMonitoring } from '../hooks';
import MetricsCard from './MetricsCard';
import GPIOMonitor from './GPIOMonitor';
import WiFiScanner from './WiFiScanner';
import I2CStatusPanel from './I2CStatusPanel';

interface SystemDashboardProps {
  monitoringData: MonitoringData;
  onSendCommand: (command: string) => void;
  isConnected?: boolean;
}

const SystemDashboard: React.FC<SystemDashboardProps> = ({ monitoringData, onSendCommand, isConnected = true }) => {
  const { systemMetrics, gpioState, wifiNetworks, i2cDevices, lastUpdated } = monitoringData;

  const isDataStale = lastUpdated && (Date.now() - lastUpdated) > 30000; // 30 seconds

  // Auto monitoring configuration
  const [autoMonitoringConfig, setAutoMonitoringConfig] = useState({
    enabled: false,
    interval: 10000, // 10 seconds
    enableSystemMetrics: true,
    enableGPIOMonitoring: true,
    enableWiFiScanning: false,
    enableI2CMonitoring: true
  });

  const { isRunning } = useAutoMonitoring(autoMonitoringConfig, onSendCommand, isConnected);

  // Execute monitoring scripts directly
  const executeScript = (script: string) => {
    onSendCommand(`exec("""${script}""")`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-200">Sistema em Tempo Real</h3>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isDataStale ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-xs text-gray-400">
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Sem dados'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Metrics */}
        <MetricsCard
          title="Métricas do Sistema"
          metrics={systemMetrics}
          onRefresh={() => executeScript(systemMonitorScript)}
        />

        {/* GPIO Monitor */}
        <GPIOMonitor
          gpioState={gpioState}
          onRefresh={() => executeScript(gpioMonitorScript)}
        />

        {/* WiFi Scanner */}
        <WiFiScanner
          networks={wifiNetworks}
          onRefresh={() => executeScript(wifiScannerScript)}
        />

        {/* I2C Status */}
        <I2CStatusPanel
          devices={i2cDevices}
          onRefresh={() => executeScript(i2cScannerScript)}
        />
      </div>

      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div>
          <h4 className="text-md font-medium text-gray-200 mb-2">Monitoramento Automático</h4>
          <div className="flex items-center space-x-4 mb-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoMonitoringConfig.enabled}
                onChange={(e) => setAutoMonitoringConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-gray-300">
                Ativar monitoramento automático {isRunning && <span className="text-green-400">(Ativo)</span>}
              </span>
            </label>
            <select
              value={autoMonitoringConfig.interval}
              onChange={(e) => setAutoMonitoringConfig(prev => ({ ...prev, interval: Number(e.target.value) }))}
              className="bg-gray-700 text-gray-300 text-xs rounded px-2 py-1"
              disabled={!autoMonitoringConfig.enabled}
            >
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1min</option>
            </select>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-200 mb-2">Controles Manuais</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => executeScript(systemMonitorScript)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              disabled={!isConnected}
            >
              Atualizar Sistema
            </button>
            <button
              onClick={() => executeScript(gpioMonitorScript)}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
              disabled={!isConnected}
            >
              Verificar GPIO
            </button>
            <button
              onClick={() => executeScript(wifiScannerScript)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
              disabled={!isConnected}
            >
              Escanear WiFi
            </button>
            <button
              onClick={() => executeScript(i2cScannerScript)}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
              disabled={!isConnected}
            >
              Escanear I2C
            </button>
            <button
              onClick={() => {
                executeScript(systemMonitorScript);
                setTimeout(() => executeScript(gpioMonitorScript), 500);
                setTimeout(() => executeScript(i2cScannerScript), 1000);
              }}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm transition-colors"
              disabled={!isConnected}
            >
              Atualizar Tudo
            </button>
            <button
              onClick={() => executeScript(testMonitoringScript)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
              disabled={!isConnected}
            >
              Teste (dados simulados)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDashboard;