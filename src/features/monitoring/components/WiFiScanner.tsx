import React from 'react';
import { RefreshIcon, WifiIcon, WifiOffIcon } from '../../../components/icons';
import { WiFiNetwork } from '../types';

interface WiFiScannerProps {
  networks?: WiFiNetwork[];
  onRefresh: () => void;
}

const WiFiScanner: React.FC<WiFiScannerProps> = ({ networks, onRefresh }) => {
  const getSignalStrength = (rssi: number) => {
    if (rssi >= -50) return 'excelente';
    if (rssi >= -60) return 'bom';
    if (rssi >= -70) return 'regular';
    return 'fraco';
  };

  const getSignalColor = (rssi: number) => {
    if (rssi >= -50) return 'text-green-400';
    if (rssi >= -60) return 'text-yellow-400';
    if (rssi >= -70) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSignalBars = (rssi: number) => {
    const bars = Math.min(4, Math.max(0, Math.floor((rssi + 100) / 12.5)));
    return bars;
  };

  const renderSignalBars = (rssi: number) => {
    const bars = getSignalBars(rssi);
    const color = getSignalColor(rssi);
    
    return (
      <div className="flex items-end space-x-0.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1 ${bar <= bars ? color.replace('text-', 'bg-') : 'bg-gray-600'}`}
            style={{ height: `${bar * 3 + 2}px` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-medium text-gray-200">Redes WiFi</h4>
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Escanear redes WiFi"
        >
          <RefreshIcon className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {networks && networks.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {networks
            .sort((a, b) => b.rssi - a.rssi) // Sort by signal strength
            .map((network, index) => (
              <div
                key={`${network.ssid}-${index}`}
                className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
              >
                <div className="flex items-center space-x-3">
                  <WifiIcon className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-200">
                      {network.ssid || '<Oculto>'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {network.security && `${network.security} • `}
                      Canal {network.channel || 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className={`text-xs font-mono ${getSignalColor(network.rssi)}`}>
                      {network.rssi} dBm
                    </div>
                    <div className="text-xs text-gray-500">
                      {getSignalStrength(network.rssi)}
                    </div>
                  </div>
                  {renderSignalBars(network.rssi)}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <div className="mb-4">
            <WifiOffIcon className="w-12 h-12 mx-auto text-gray-600" />
          </div>
          <p>Nenhuma rede encontrada</p>
          <p className="text-xs mt-1">Clique no botão atualizar para escanear redes WiFi</p>
        </div>
      )}

      {networks && networks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{networks.length} redes encontradas</span>
            <div className="flex items-center space-x-2">
              <span>Sinal:</span>
              <div className="flex items-center space-x-1">
                <div className="w-1 h-2 bg-green-400" />
                <span>Forte</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1 h-2 bg-red-400" />
                <span>Fraco</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WiFiScanner;