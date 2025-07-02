import React, { useEffect } from 'react';
import { ReplConnection } from '../types';
import ReplConnectionCard from './ReplConnectionCard';
import { useConnections } from '../context';

interface ReplManagerProps {
  onEdit: (connection: ReplConnection) => void;
}

const ReplManager: React.FC<ReplManagerProps> = ({ onEdit }) => {
  const { state, actions } = useConnections();

  useEffect(() => {
    actions.loadConnections();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEdit = (id: string) => {
    const connectionToEdit = state.connections.find(c => c.id === id);
    if (connectionToEdit) {
      onEdit(connectionToEdit);
    }
  };

  if (state.isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-400">Loading connections...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
        Error: {state.error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {state.connections.map(conn => (
        <ReplConnectionCard
          key={conn.id}
          connection={conn}
          onRemove={actions.removeConnection}
          onEdit={handleEdit}
        />
      ))}
    </div>
  );
};

export default ReplManager;