import React, { useState } from 'react';
import { ReplManager, ConnectionProvider, useConnections } from '@/features/connections';
import { AddConnectionForm } from '@/components/forms';
import { PlusIcon } from '@/components/icons';
import { ReplConnection } from '@/shared/types';
import { ErrorBoundary } from '@/components/common';

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
    <ErrorBoundary>
      <ConnectionProvider>
        <AppContent 
          isFormOpen={isFormOpen}
          editingConnection={editingConnection}
          onFormOpen={handleFormOpen}
          onFormClose={handleFormClose}
          onEdit={(connection) => {
            setEditingConnection(connection);
            setIsFormOpen(true);
          }}
        />
      </ConnectionProvider>
    </ErrorBoundary>
  );
}

interface AppContentProps {
  isFormOpen: boolean;
  editingConnection: ReplConnection | null;
  onFormOpen: () => void;
  onFormClose: () => void;
  onEdit: (connection: ReplConnection) => void;
}

function AppContent({ isFormOpen, editingConnection, onFormOpen, onFormClose, onEdit }: AppContentProps) {
  const { actions } = useConnections();

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
            onClick={onFormOpen}
            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex-shrink-0 ml-4"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Connection</span>
          </button>
        </header>

        {isFormOpen && (
          <AddConnectionForm
            onSave={(connection) => {
              onFormClose();
              if (editingConnection) {
                actions.updateConnection(editingConnection.id, connection);
              } else {
                actions.addConnection(connection);
              }
            }}
            onCancel={onFormClose}
            existingConnection={editingConnection}
          />
        )}

        <ReplManager onEdit={onEdit} />
      </div>
    </main>
  );
}

export default App;
