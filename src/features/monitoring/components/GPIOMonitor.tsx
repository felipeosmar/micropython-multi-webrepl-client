import React from 'react';
import { RefreshIcon } from '../../../components/icons';
import { GPIOState } from '../types';

interface GPIOMonitorProps {
  gpioState?: GPIOState;
  onRefresh: () => void;
}

const GPIOMonitor: React.FC<GPIOMonitorProps> = ({ gpioState, onRefresh }) => {
  const getPinColor = (value: number) => {
    return value === 1 ? 'bg-green-500' : 'bg-gray-600';
  };

  const getPinTextColor = (value: number) => {
    return value === 1 ? 'text-green-400' : 'text-gray-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-medium text-gray-200">Monitor GPIO</h4>
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Atualizar estado dos pinos"
        >
          <RefreshIcon className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {gpioState && Object.keys(gpioState).length > 0 ? (
        <div className="space-y-3">
          {/* GPIO Pin Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(gpioState).map(([pinName, value]) => {
              const pinNumber = pinName.replace('pin_', '');
              return (
                <div
                  key={pinName}
                  className="flex items-center justify-between bg-gray-700 rounded-lg p-2"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getPinColor(value)}`}
                      title={value === 1 ? 'HIGH' : 'LOW'}
                    />
                    <span className="text-sm text-gray-300">Pin {pinNumber}</span>
                  </div>
                  <span className={`text-xs font-mono ${getPinTextColor(value)}`}>
                    {value === 1 ? 'HIGH' : 'LOW'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center space-x-4 pt-2 border-t border-gray-700">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-400">HIGH (1)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-600 rounded-full" />
              <span className="text-xs text-gray-400">LOW (0)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          </div>
          <p>Nenhum dado GPIO disponível</p>
          <p className="text-xs mt-1">Clique no botão atualizar para verificar os pinos</p>
        </div>
      )}
    </div>
  );
};

export default GPIOMonitor;