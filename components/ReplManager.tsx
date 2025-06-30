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
    try {
      const savedConnections = localStorage.getItem('webrepl-connections');
      if (savedConnections) {
        setConnections(JSON.parse(savedConnections));
      }
    } catch (error) {
      console.error("Failed to load connections from localStorage", error);
      setConnections([]);
    }
  }, []);

  useEffect(() => {
    try {
      // Remove o objeto 'port' antes de salvar, pois ele não é serializável
      const connectionsToSave = connections.map(({ port, ...rest }) => rest);
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