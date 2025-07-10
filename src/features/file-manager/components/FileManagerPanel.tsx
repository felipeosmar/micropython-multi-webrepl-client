import React from 'react';

interface FileManagerPanelProps {
  fileCommands: any;
  isConnected: boolean;
}

const FileManagerPanel: React.FC<FileManagerPanelProps> = ({
  fileCommands,
  isConnected
}) => {
  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900">
        <p className="text-sm">Conecte-se para gerenciar arquivos</p>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
      <p className="text-sm">Funcionalidade de arquivos temporariamente desabilitada</p>
    </div>
  );
};

export default FileManagerPanel;