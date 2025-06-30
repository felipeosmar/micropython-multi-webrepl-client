import React, { useState, useEffect } from 'react';
import { ReplConnection } from '../types';

interface AddConnectionFormProps {
  onSave: (connection: Omit<ReplConnection, 'id'>) => void;
  onCancel: () => void;
  existingConnection?: ReplConnection | null;
}

const AddConnectionForm: React.FC<AddConnectionFormProps> = ({ onSave, onCancel, existingConnection }) => {
  const [name, setName] = useState('');
  const [connectionType, setConnectionType] = useState<'webrepl' | 'serial'>('webrepl');
  const [ip, setIp] = useState('192.168.4.1');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (existingConnection) {
      setName(existingConnection.name);
      setConnectionType(existingConnection.connectionType);
      if (existingConnection.connectionType === 'webrepl') {
        setIp(existingConnection.ip || '192.168.4.1');
        setPassword(existingConnection.password || '');
      }
    }
  }, [existingConnection]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      if (connectionType === 'webrepl' && ip.trim()) {
        onSave({ name, connectionType, ip, password });
      } else if (connectionType === 'serial') {
        onSave({ name, connectionType, ip: '' }); // IP fica vazio para serial
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
             <div className="mb-4 p-3 bg-gray-700/50 rounded-md border border-gray-600">
                <p className="text-gray-300 text-sm">
                    Serial connection must be initiated from the connection card after saving.
                    You will be prompted to select a serial port by the browser.
                </p>
             </div>
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