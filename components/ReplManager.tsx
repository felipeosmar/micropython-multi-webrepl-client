import React, { useState, useEffect } from 'react';
import { ReplConnection } from '@/types';
import ReplConnectionCard from './ReplConnectionCard';
import AddConnectionForm from './AddConnectionForm';
import { PlusIcon } from './icons/PlusIcon';

const ReplManager: React.FC = () => {
  const [connections, setConnections] = useState<ReplConnection[]>([]);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingConnection, setEditingConnection] = useState<ReplConnection | null>(null);

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const savedConnections = localStorage.getItem('webrepl-connections');
        if (savedConnections) {
          const parsed = JSON.parse(savedConnections);
          
          // Para conexões seriais, tenta reestabelecer a porta
          const connectionsWithPorts = await Promise.all(
            parsed.map(async (conn: any) => {
              if (conn.connectionType === 'serial' && conn.portInfo) {
                try {
                  const ports = await navigator.serial.getPorts();
                  const matchingPort = ports.find(port => {
                    const info = port.getInfo();
                    return info.usbVendorId === conn.portInfo.vendorId && 
                           info.usbProductId === conn.portInfo.productId;
                  });
                  return { ...conn, port: matchingPort || null };
                } catch {
                  return { ...conn, port: null };
                }
              }
              return conn;
            })
          );
          
          setConnections(connectionsWithPorts);
        }
      } catch (error) {
        console.error("Failed to load connections from localStorage", error);
        setConnections([]);
      }
    };
    
    loadConnections();
  }, []);

  useEffect(() => {
    try {
      // Remove o objeto 'port' antes de salvar, pois ele não é serializável
      const connectionsToSave = connections.map(({ port, ...rest }) => ({
        ...rest,
        // Salva informações da porta para tentar reconectar
        portInfo: port ? {
          vendorId: port.getInfo().usbVendorId,
          productId: port.getInfo().usbProductId
        } : null
      }));
      localStorage.setItem(
        'webrepl-connections',
        JSON.stringify(connectionsToSave)
      );
    } catch (error) {
       console.error("Failed to save connections to localStorage", error);
    }
  }, [connections]);

  const handleSaveConnection = (connection: Omit<ReplConnection, 'id'>) => {
    if (editingConnection) {
      // Update existing connection
      const updatedConnections = connections.map(c =>
        c.id === editingConnection.id ? { ...c, ...connection } : c
      );
      setConnections(updatedConnections);
      setEditingConnection(null);
    } else {
      // Add new connection
      const newConnection: ReplConnection = {
        id: `repl-${Date.now()}`,
        ...connection,
      };
      setConnections([...connections, newConnection]);
    }
    setIsFormOpen(false);
  };

  const removeConnection = (id: string) => {
    setConnections(connections.filter(c => c.id !== id));
  };

  const handleEdit = (id: string) => {
    const connectionToEdit = connections.find(c => c.id === id);
    if (connectionToEdit) {
      setEditingConnection(connectionToEdit);
      setIsFormOpen(true);
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingConnection(null);
  };

  return (
    <div>
      {isFormOpen && (
        <AddConnectionForm
          onSave={handleSaveConnection}
          onCancel={handleCancel}
          existingConnection={editingConnection}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {connections.map(conn => (
          <ReplConnectionCard
            key={conn.id}
            connection={conn}
            onRemove={removeConnection}
            onEdit={handleEdit}
          />
        ))}
        <div className="flex items-center justify-center min-h-[400px] bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg hover:border-cyan-400 hover:bg-gray-800 transition-colors duration-300">
           <button
            onClick={() => setIsFormOpen(true)}
            className="flex flex-col items-center justify-center text-gray-400 hover:text-cyan-400 transition-colors"
          >
            <PlusIcon className="w-16 h-16" />
            <span className="mt-2 text-lg font-semibold">Add New Connection</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplManager;