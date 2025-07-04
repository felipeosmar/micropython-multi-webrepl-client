import React from 'react';
import { RefreshIcon } from '../../../components/icons';
import { I2CDevice } from '../types';

interface I2CStatusPanelProps {
  devices?: I2CDevice[];
  onRefresh: () => void;
}

const I2CStatusPanel: React.FC<I2CStatusPanelProps> = ({ devices, onRefresh }) => {
  const formatAddress = (address: number) => {
    return `0x${address.toString(16).toUpperCase().padStart(2, '0')}`;
  };

  const getDeviceName = (address: number) => {
    // Common I2C device addresses
    const deviceMap: { [key: number]: string } = {
      0x3C: 'OLED Display (SSD1306)',
      0x3D: 'OLED Display (SSD1306)',
      0x48: 'ADC (ADS1115)',
      0x49: 'ADC (ADS1115)',
      0x4A: 'ADC (ADS1115)',
      0x4B: 'ADC (ADS1115)',
      0x68: 'RTC (DS1307/DS3231)',
      0x69: 'RTC (DS3231)',
      0x76: 'BME280 Sensor',
      0x77: 'BME280/BMP280 Sensor',
      0x5A: 'MPU6050 Gyro/Accel',
      0x5B: 'MPU6050 Gyro/Accel',
      0x23: 'BH1750 Light Sensor',
      0x40: 'PCA9685 PWM Driver',
      0x41: 'PCA9685 PWM Driver',
      0x42: 'PCA9685 PWM Driver',
      0x43: 'PCA9685 PWM Driver',
      0x44: 'PCA9685 PWM Driver',
      0x45: 'PCA9685 PWM Driver',
      0x46: 'PCA9685 PWM Driver',
      0x47: 'PCA9685 PWM Driver'
    };
    
    return deviceMap[address] || 'Dispositivo desconhecido';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'inactive':
        return 'text-gray-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-medium text-gray-200">Dispositivos I2C</h4>
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Escanear dispositivos I2C"
        >
          <RefreshIcon className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {devices && devices.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {devices
            .sort((a, b) => a.address - b.address)
            .map((device, index) => (
              <div
                key={`${device.address}-${index}`}
                className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot(device.status)}`} />
                  <div>
                    <div className="text-sm font-medium text-gray-200">
                      {formatAddress(device.address)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {getDeviceName(device.address)}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-xs font-medium ${getStatusColor(device.status)}`}>
                    {device.status.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
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
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p>Nenhum dispositivo I2C encontrado</p>
          <p className="text-xs mt-1">Clique no botão atualizar para escanear o barramento I2C</p>
        </div>
      )}

      {devices && devices.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{devices.length} dispositivos encontrados</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Ativo</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>Erro</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default I2CStatusPanel;