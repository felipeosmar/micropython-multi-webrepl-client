import React, { useState } from 'react';
import { ReplConnection, ReplStatus } from '@/types';
import { useWebRepl } from '../hooks/useWebRepl';
import { useSerial } from '../hooks/useSerial';
import Terminal from './Terminal';
import FileManagerPanel from './FileManagerPanel';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { WifiIcon } from './icons/WifiIcon';
import { WifiOffIcon } from './icons/WifiOffIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { FolderIcon } from './icons/FolderIcon';

const getSerialPortName = (port: SerialPort): string => {
  const info = port.getInfo();
  
  // Mapeamento de vendors conhecidos para mostrar nomes mais amigáveis
  const vendorNames: { [key: number]: string } = {
    0x2341: 'Arduino',
    0x1A86: 'CH340 USB-Serial',
    0x0403: 'FTDI',
    0x067B: 'Prolific',
    0x10C4: 'Silicon Labs',
    0x1D50: 'OpenMoko',
    0x239A: 'Adafruit',
    0x303A: 'Espressif' // ESP32
  };
  
  const vendorName = info.usbVendorId ? vendorNames[info.usbVendorId] : null;
  
  if (vendorName) {
    return `${vendorName} Device`;
  } else if (info.usbVendorId && info.usbProductId) {
    return `USB Device (${info.usbVendorId.toString(16).padStart(4, '0')}:${info.usbProductId.toString(16).padStart(4, '0')})`;
  } else {
    return 'Serial Device';
  }
};

const StatusIndicator: React.FC<{ status: ReplStatus; onReconnect?: () => void; }> = ({ status, onReconnect }) => {
  const statusConfig = {
    [ReplStatus.CONNECTED]: { text: 'Connected', color: 'text-green-400', icon: <WifiIcon className="w-5 h-5" /> },
    [ReplStatus.CONNECTING]: { text: 'Connecting...', color: 'text-yellow-400', icon: <WifiIcon className="w-5 h-5 animate-pulse" /> },
    [ReplStatus.PASSWORD]: { text: 'Password Required', color: 'text-orange-400', icon: <WifiIcon className="w-5 h-5" /> },
    [ReplStatus.DISCONNECTED]: { text: 'Disconnected', color: 'text-gray-500', icon: <WifiOffIcon className="w-5 h-5" /> },
    [ReplStatus.ERROR]: { text: 'Error', color: 'text-red-500', icon: <WifiOffIcon className="w-5 h-5" /> },
  };
  const config = statusConfig[status];

  return (
    <div className={`flex items-center space-x-2 text-sm font-semibold ${config.color}`}>
      {config.icon}
      <span>{config.text}</span>
       {(status === ReplStatus.DISCONNECTED || status === ReplStatus.ERROR) && onReconnect && (
        <button onClick={onReconnect} className="text-gray-500 hover:text-cyan-400 transition-colors" aria-label="Reconnect">
          <RefreshIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

interface ReplConnectionCardProps {
  connection: ReplConnection;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
}

const ReplConnectionCard: React.FC<ReplConnectionCardProps> = ({ connection, onRemove, onEdit }) => {
  const isSerial = connection.connectionType === 'serial';
  
  // Hooks condicionais não são permitidos, então criamos um componente wrapper
  return isSerial ? (
    <SerialCardContent connection={connection} onRemove={onRemove} onEdit={onEdit} />
  ) : (
    <WebReplCardContent connection={connection} onRemove={onRemove} onEdit={onEdit} />
  );
};

// Componente para a lógica do WebREPL
const WebReplCardContent: React.FC<ReplConnectionCardProps> = ({ connection, onRemove, onEdit }) => {
  const { status, lines, sendData, sendCommand, reconnect } = useWebRepl(`ws://${connection.ip}:8266`, connection.password);
  const [password, setPassword] = useState('');

  const handleCommand = (cmd: string) => sendCommand(cmd);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendData(password + '\r');
    setPassword('');
  };

  return (
    <CardLayout
      connection={connection}
      status={status}
      lines={lines}
      onCommand={handleCommand}
      onReconnect={reconnect}
      onEdit={onEdit}
      onRemove={onRemove}
      sendData={sendData}
      sendCommand={sendCommand}
    >
      {status === ReplStatus.PASSWORD && (
        <form onSubmit={handlePasswordSubmit} className="p-2 border-t border-gray-700 bg-gray-900/50">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password..."
            autoFocus
            className="w-full bg-gray-700 text-gray-100 placeholder-gray-400 px-3 py-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono text-sm"
          />
        </form>
      )}
    </CardLayout>
  );
};

// Componente para a lógica Serial
const SerialCardContent: React.FC<ReplConnectionCardProps> = ({ connection, onRemove, onEdit }) => {
  const { status, lines, sendCommand, connect, clearOutput, autoScroll } = useSerial(
    connection.port, 
    connection.baudRate,
    connection.lineEnding,
    connection.autoScroll,
    connection.showTimestamp
  );

  const handleCommand = (cmd: string) => sendCommand(cmd);

  return (
    <CardLayout
      connection={connection}
      status={status}
      lines={lines}
      onCommand={handleCommand}
      onReconnect={connect}
      onEdit={onEdit}
      onRemove={onRemove}
      autoScroll={autoScroll}
      onClear={clearOutput}
    >
      {/* O botão de conexão foi removido, a conexão agora é automática */}
    </CardLayout>
  );
};

interface CardLayoutProps {
  connection: ReplConnection;
  status: ReplStatus;
  lines: string[];
  onCommand: (cmd: string) => void;
  onReconnect: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  children?: React.ReactNode;
  autoScroll?: boolean;
  onClear?: () => void;
  sendData?: (data: string) => Promise<void> | void;
  sendCommand?: (command: string) => void;
}

// Layout reutilizável do cartão
const CardLayout: React.FC<CardLayoutProps> = ({ 
  connection, 
  status, 
  lines, 
  onCommand, 
  onReconnect, 
  onEdit, 
  onRemove, 
  children, 
  autoScroll, 
  onClear,
  sendData,
  sendCommand
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'files'>('terminal');
  const isConnected = status === ReplStatus.CONNECTED;
  const isWebRepl = connection.connectionType === 'webrepl';

  return (
    <div className={`bg-gray-800 rounded-lg shadow-lg flex flex-col h-[500px] overflow-hidden border border-gray-700 ${
      isWebRepl && activeTab === 'files' ? 'w-full max-w-4xl' : ''
    }`}>
      <header className="flex items-center justify-between p-3 bg-gray-900/50 border-b border-gray-700">
        <div className="flex flex-col">
          <h3 className="font-bold text-lg text-cyan-400">{connection.name}</h3>
          <p className="text-xs text-gray-400 font-mono">
            {connection.connectionType === 'serial' 
              ? `Serial Connection - ${connection.baudRate || 115200} baud${connection.port ? ` - ${getSerialPortName(connection.port)}` : ''}`
              : connection.ip}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <StatusIndicator status={status} onReconnect={onReconnect} />
          <button
            onClick={() => onEdit(connection.id)}
            className="text-gray-500 hover:text-yellow-400 transition-colors"
            aria-label="Edit Connection"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onRemove(connection.id)}
            className="text-gray-500 hover:text-red-500 transition-colors"
            aria-label="Remove Connection"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Abas - apenas para conexões WebREPL */}
      {isWebRepl && (
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'terminal'
                ? 'bg-gray-700 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span>💻</span>
            <span>Terminal</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'files'
                ? 'bg-gray-700 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            disabled={!isConnected}
          >
            <FolderIcon className="w-4 h-4" />
            <span>Arquivos</span>
          </button>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-grow overflow-hidden flex">
        {/* Terminal - sempre visível */}
        <div className={`${isWebRepl && activeTab === 'files' ? 'flex-1' : 'w-full'} p-1`}>
          <Terminal lines={lines} onCommand={onCommand} autoScroll={autoScroll} onClear={onClear} />
        </div>
        
        {/* File Manager Sidebar - apenas visível quando aba de arquivos está ativa */}
        {isWebRepl && activeTab === 'files' && (
          <div className="w-80 flex-shrink-0">
            <FileManagerPanel
              sendData={sendData!}
              sendCommand={sendCommand!}
              isConnected={isConnected}
            />
          </div>
        )}
      </div>
      
      {children}
    </div>
  );
};

export default ReplConnectionCard;