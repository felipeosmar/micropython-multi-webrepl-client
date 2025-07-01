import React, { useState, useEffect } from 'react';
import { ReplConnection } from '@/types';
import ReplConnectionCard from './ReplConnectionCard';

interface ReplManagerProps {
  onEdit: (connection: ReplConnection) => void;
}

const ReplManager: React.FC<ReplManagerProps> = ({ onEdit }) => {
  const [connections, setConnections] = useState<ReplConnection[]>([]);

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

  // Listen for add and update connection events from App component
  useEffect(() => {
    const handleAddConnection = (event: CustomEvent) => {
      const connection = event.detail;
      const newConnection: ReplConnection = {
        id: `repl-${Date.now()}`,
        ...connection,
      };
      setConnections(prev => [...prev, newConnection]);
    };

    const handleUpdateConnection = (event: CustomEvent) => {
      const { id, connection } = event.detail;
      setConnections(prev => prev.map(c => 
        c.id === id ? { ...c, ...connection } : c
      ));
    };

    window.addEventListener('addConnection', handleAddConnection as EventListener);
    window.addEventListener('updateConnection', handleUpdateConnection as EventListener);
    
    return () => {
      window.removeEventListener('addConnection', handleAddConnection as EventListener);
      window.removeEventListener('updateConnection', handleUpdateConnection as EventListener);
    };
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

  const removeConnection = (id: string) => {
    setConnections(connections.filter(c => c.id !== id));
  };

  const handleEdit = (id: string) => {
    const connectionToEdit = connections.find(c => c.id === id);
    if (connectionToEdit) {
      onEdit(connectionToEdit);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {connections.map(conn => (
        <ReplConnectionCard
          key={conn.id}
          connection={conn}
          onRemove={removeConnection}
          onEdit={handleEdit}
        />
      ))}
    </div>
  );
};

export default ReplManager;