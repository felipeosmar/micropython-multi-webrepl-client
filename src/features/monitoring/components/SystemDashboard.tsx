import React from 'react';
import { MonitoringData } from '../types';
import MetricsCard from './MetricsCard';
import GPIOMonitor from './GPIOMonitor';
import WiFiScanner from './WiFiScanner';
import I2CStatusPanel from './I2CStatusPanel';

interface SystemDashboardProps {
  monitoringData: MonitoringData;
  onSendCommand: (command: string) => void;
}

const SystemDashboard: React.FC<SystemDashboardProps> = ({ monitoringData, onSendCommand }) => {
  const { systemMetrics, gpioState, wifiNetworks, i2cDevices, lastUpdated } = monitoringData;

  const isDataStale = lastUpdated && (Date.now() - lastUpdated) > 30000; // 30 seconds

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
          onRefresh={() => onSendCommand('exec(open("system_monitor.py").read())')}
        />

        {/* GPIO Monitor */}
        <GPIOMonitor
          gpioState={gpioState}
          onRefresh={() => onSendCommand('exec(open("gpio_monitor.py").read())')}
        />

        {/* WiFi Scanner */}
        <WiFiScanner
          networks={wifiNetworks}
          onRefresh={() => onSendCommand('exec(open("wifi_scanner.py").read())')}
        />

        {/* I2C Status */}
        <I2CStatusPanel
          devices={i2cDevices}
          onRefresh={() => onSendCommand('exec(open("i2c_scanner.py").read())')}
        />
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-200 mb-2">Controles de Monitoramento</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSendCommand('exec(open("system_monitor.py").read())')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            Atualizar Sistema
          </button>
          <button
            onClick={() => onSendCommand('exec(open("gpio_monitor.py").read())')}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
          >
            Verificar GPIO
          </button>
          <button
            onClick={() => onSendCommand('exec(open("wifi_scanner.py").read())')}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
          >
            Escanear WiFi
          </button>
          <button
            onClick={() => onSendCommand('exec(open("i2c_scanner.py").read())')}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
          >
            Escanear I2C
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemDashboard;