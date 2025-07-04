import React from 'react';
import { RefreshIcon } from '../../../components/icons';
import { SystemMetrics } from '../types';

interface MetricsCardProps {
  title: string;
  metrics?: SystemMetrics;
  onRefresh: () => void;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, metrics, onRefresh }) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatFrequency = (freq: number) => {
    if (freq >= 1000000) {
      return (freq / 1000000).toFixed(0) + ' MHz';
    } else if (freq >= 1000) {
      return (freq / 1000).toFixed(0) + ' kHz';
    }
    return freq + ' Hz';
  };

  const getMemoryUsagePercentage = () => {
    if (!metrics || !metrics.memory) return 0;
    const total = metrics.memory.free + metrics.memory.allocated;
    return total > 0 ? (metrics.memory.allocated / total) * 100 : 0;
  };

  const memoryUsage = getMemoryUsagePercentage();
  const memoryColor = memoryUsage > 80 ? 'bg-red-500' : memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-medium text-gray-200">{title}</h4>
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Atualizar métricas"
        >
          <RefreshIcon className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {metrics ? (
        <div className="space-y-3">
          {/* Memory Usage */}
          <div>
            <div className="flex justify-between text-sm text-gray-300 mb-1">
              <span>Memória</span>
              <span>{memoryUsage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${memoryColor}`}
                style={{ width: `${memoryUsage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Livre: {formatBytes(metrics.memory.free)}</span>
              <span>Usado: {formatBytes(metrics.memory.allocated)}</span>
            </div>
          </div>

          {/* CPU Frequency */}
          <div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Frequência CPU</span>
              <span className="font-mono">{formatFrequency(metrics.freq)}</span>
            </div>
          </div>

          {/* Temperature */}
          {metrics.temp !== undefined && (
            <div>
              <div className="flex justify-between text-sm text-gray-300">
                <span>Temperatura</span>
                <span className="font-mono">{metrics.temp.toFixed(1)}°C</span>
              </div>
            </div>
          )}

          {/* Last Update */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
            Atualizado: {new Date(metrics.timestamp * 1000).toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p>Nenhum dado disponível</p>
          <p className="text-xs mt-1">Clique no botão atualizar para obter métricas</p>
        </div>
      )}
    </div>
  );
};

export default MetricsCard;