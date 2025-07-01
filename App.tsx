import React, { useState } from 'react';
import ReplManager from './components/ReplManager';
import AddConnectionForm from './components/AddConnectionForm';
import { PlusIcon } from './components/icons/PlusIcon';
import { ReplConnection } from '@/types';

function App(): React.ReactNode {
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingConnection, setEditingConnection] = useState<ReplConnection | null>(null);

  const handleFormOpen = () => {
    setEditingConnection(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingConnection(null);
  };

  return (
    <main className="bg-gray-900 text-gray-100 min-h-screen font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400">
              MicroPython Multi-WebREPL Client
            </h1>
            <p className="text-gray-400 mt-2">
              Connect to multiple boards from one dashboard.
            </p>
          </div>
          <button
            onClick={handleFormOpen}
            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex-shrink-0 ml-4"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Connection</span>
          </button>
        </header>

        {isFormOpen && (
          <AddConnectionForm
            onSave={(connection) => {
              handleFormClose();
              if (editingConnection) {
                // Update existing connection
                window.dispatchEvent(new CustomEvent('updateConnection', { 
                  detail: { id: editingConnection.id, connection } 
                }));
              } else {
                // Add new connection
                window.dispatchEvent(new CustomEvent('addConnection', { detail: connection }));
              }
            }}
            onCancel={handleFormClose}
            existingConnection={editingConnection}
          />
        )}

        <ReplManager 
          onEdit={(connection) => {
            setEditingConnection(connection);
            setIsFormOpen(true);
          }}
        />
      </div>
    </main>
  );
}

export default App;
