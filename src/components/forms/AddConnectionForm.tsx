import React, { useState, useEffect } from 'react';
import { ReplConnection } from '@/shared/types';

interface AddConnectionFormProps {
  onSave: (connection: Omit<ReplConnection, 'id'>) => void;
  onCancel: () => void;
  existingConnection?: ReplConnection | null;
}

const baudRateOptions = [
  300, 600, 750, 1200, 2400, 4800, 9600, 19200, 31250, 38400, 57600, 74880,
  115200, 230400, 250000, 460800, 500000, 921600, 1000000, 2000000,
];

const AddConnectionForm: React.FC<AddConnectionFormProps> = ({ onSave, onCancel, existingConnection }) => {
  const [name, setName] = useState('');
  const [connectionType, setConnectionType] = useState<'webrepl' | 'serial'>('webrepl');
  const [ip, setIp] = useState('192.168.4.1');
  const [password, setPassword] = useState('');
  const [port, setPort] = useState<SerialPort | null>(null);
  const [baudRate, setBaudRate] = useState(115200);
  const [lineEnding, setLineEnding] = useState<'none' | 'newline' | 'carriageReturn' | 'both'>('carriageReturn');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(false);

  const handleRequestPort = async () => {
    if ('serial' in navigator) {
      try {
        const selectedPort = await navigator.serial.requestPort();
        setPort(selectedPort);
      } catch (error) {
        console.error("Error selecting serial port:", error);
        alert(`Error selecting serial port: ${(error as Error).message}`);
      }
    } else {
      alert('Web Serial API not supported in this browser.');
    }
  };

  useEffect(() => {
    // Removido o request automático para melhorar a UX.
    // O usuário agora clica no botão para selecionar a porta.
    // Se o tipo de conexão for alterado de volta para webrepl, limpa a porta.
    if (connectionType === 'webrepl') setPort(null);
  }, [connectionType]);

  useEffect(() => {
    if (existingConnection) {
      setName(existingConnection.name);
      setConnectionType(existingConnection.connectionType);
      if (existingConnection.connectionType === 'webrepl') {
        setIp(existingConnection.ip || '192.168.4.1');
        setPassword(existingConnection.password || '');
      } else if (existingConnection.connectionType === 'serial') {
        setBaudRate(existingConnection.baudRate || 115200);
        setPort(existingConnection.port || null);
        setLineEnding(existingConnection.lineEnding || 'carriageReturn');
        setAutoScroll(existingConnection.autoScroll ?? true);
        setShowTimestamp(existingConnection.showTimestamp || false);
      }
    }
  }, [existingConnection]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      if (connectionType === 'webrepl' && ip.trim()) {
        onSave({ name, connectionType, ip, password });
      } else if (connectionType === 'serial' && port) { 
        const portInfo = {
          vendorId: port.getInfo().usbVendorId,
          productId: port.getInfo().usbProductId
        };
        onSave({ name, connectionType, ip: '', port, baudRate, portInfo, lineEnding, autoScroll, showTimestamp });
      } else if (connectionType === 'serial' && !port) {
        alert('Please select a serial port.');
      }
    }
  };

  const isEditing = !!existingConnection;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-cyan-400">
          {isEditing ? 'Edit Connection' : 'New Connection'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Connection Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="webrepl"
                  checked={connectionType === 'webrepl'}
                  onChange={() => setConnectionType('webrepl')}
                  className="form-radio h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                />
                <span className="ml-2 text-gray-200">WebREPL</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="serial"
                  checked={connectionType === 'serial'}
                  onChange={() => setConnectionType('serial')}
                  className="form-radio h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                />
                <span className="ml-2 text-gray-200">Serial</span>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="conn-name" className="block text-gray-300 mb-2">Connection Name</label>
            <input
              id="conn-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My ESP32 Board"
              required
              className="w-full bg-gray-700 text-gray-100 placeholder-gray-400 px-3 py-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>
          {connectionType === 'webrepl' && (
            <>
              <div className="mb-4">
                <label htmlFor="conn-ip" className="block text-gray-300 mb-2">IP Address</label>
                <input
                  id="conn-ip"
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="192.168.4.1"
                  required
                  className="w-full bg-gray-700 text-gray-100 placeholder-gray-400 px-3 py-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="conn-password" className="block text-gray-300 mb-2">Password (optional)</label>
                <input
                  id="conn-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="WebREPL password"
                  className="w-full bg-gray-700 text-gray-100 placeholder-gray-400 px-3 py-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {connectionType === 'serial' && (
            <>
            <div className="mb-4">
              <label htmlFor="conn-baud" className="block text-gray-300 mb-2">Baud Rate</label>
              <select
                id="conn-baud"
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                required
                className="w-full bg-gray-700 text-gray-100 placeholder-gray-400 px-3 py-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                {baudRateOptions.map(rate => (
                  <option key={rate} value={rate}>{rate}{rate === 115200 && ' (Default)'}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="conn-line-ending" className="block text-gray-300 mb-2">Terminador de Linha</label>
              <select
                id="conn-line-ending"
                value={lineEnding}
                onChange={(e) => setLineEnding(e.target.value as 'none' | 'newline' | 'carriageReturn' | 'both')}
                className="w-full bg-gray-700 text-gray-100 placeholder-gray-400 px-3 py-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="none">Sem final de linha</option>
                <option value="newline">Nova Linha (\n)</option>
                <option value="carriageReturn">Retorno de Carro (\r) - Padrão MicroPython</option>
                <option value="both">Ambos NL e CR (\n\r)</option>
              </select>
            </div>
            <div className="mb-4 space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500 rounded"
                />
                <span className="ml-2 text-gray-300">Autoscroll</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showTimestamp}
                  onChange={(e) => setShowTimestamp(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500 rounded"
                />
                <span className="ml-2 text-gray-300">Mostrar data/hora</span>
              </label>
            </div>
             <div className="mb-4 p-3 bg-gray-700/50 rounded-md border border-gray-600">
                <p className="text-gray-300 text-sm mb-3">
                    {port ? 'Porta serial selecionada. Você pode alterar a porta abaixo.' : 'Selecione a porta serial para o seu dispositivo.'}
                </p>
                <button
                  type="button"
                  onClick={handleRequestPort}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                >
                  {port ? 'Change Serial Port' : 'Select Serial Port'}
                </button>
                {port && (
                    <div className="mt-3 text-sm text-gray-300">
                        <p>Port Selected: <span className="font-mono bg-gray-900 px-2 py-1 rounded">{port.getInfo().usbVendorId?.toString(16).padStart(4, '0')}:{port.getInfo().usbProductId?.toString(16).padStart(4, '0')}</span></p>
                    </div>
                )}
             </div>
            </>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500"
            >
              {isEditing ? 'Save Changes' : 'Add Connection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddConnectionForm;