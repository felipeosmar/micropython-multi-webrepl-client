import React, { useEffect, useState } from 'react';
import { useFileOperations } from '../hooks/useFileOperations';
import FileList from './FileList';
import FileUpload from './FileUpload';

/**
 * Props do FileManagerPanel
 */
interface FileManagerPanelProps {
  /** Função para enviar dados via WebREPL */
  sendData: (data: string) => Promise<void> | void;
  /** Função para enviar comandos via WebREPL */
  sendCommand: (command: string) => void;
  /** Se a conexão está ativa */
  isConnected: boolean;
}

/**
 * Componente principal do gerenciador de arquivos
 * 
 * Funcionalidades:
 * - Interface de navegação de arquivos
 * - Upload/Download de arquivos
 * - Operações básicas de arquivo (delete, criar pasta)
 * - Breadcrumb de navegação
 */
const FileManagerPanel: React.FC<FileManagerPanelProps> = ({
  sendData,
  sendCommand,
  isConnected
}) => {
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const {
    fileManagerState,
    listFiles,
    uploadFile,
    downloadFile,
    deleteItem,
    createDirectory,
    navigateToDirectory,
    toggleItemSelection,
    clearSelection
  } = useFileOperations(sendData, sendCommand);

  const { currentPath, items, loading, error, selectedItems } = fileManagerState;

  // Carrega lista de arquivos inicial quando conecta
  useEffect(() => {
    if (isConnected) {
      listFiles('/');
    }
  }, [isConnected, listFiles]);

  /**
   * Gera breadcrumb do caminho atual
   */
  const generateBreadcrumb = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumb = [{ name: 'Root', path: '/' }];
    
    let currentFullPath = '';
    parts.forEach(part => {
      currentFullPath += `/${part}`;
      breadcrumb.push({ name: part, path: currentFullPath });
    });
    
    return breadcrumb;
  };

  /**
   * Manipula criação de nova pasta
   */
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const result = await createDirectory(newFolderName);
    if (result.success) {
      setNewFolderName('');
      setShowCreateFolder(false);
    }
  };

  /**
   * Manipula upload de múltiplos arquivos
   */
  const handleMultipleUpload = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const content = e.target?.result;
        if (content) {
          await uploadFile(file.name, content, currentPath);
        }
      };
      
      reader.readAsArrayBuffer(file);
    }
  };

  /**
   * Manipula download de arquivo
   */
  const handleDownload = async (fileName: string) => {
    const result = await downloadFile(fileName);
    if (result.success && result.data) {
      // Cria blob e faz download
      const blob = new Blob([result.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  /**
   * Manipula deleção de item
   */
  const handleDelete = async (itemName: string, isDirectory: boolean) => {
    if (confirm(`Tem certeza que deseja deletar "${itemName}"?`)) {
      await deleteItem(itemName, isDirectory);
    }
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>Conecte-se ao dispositivo para gerenciar arquivos</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-800 rounded-lg">
      {/* Header com breadcrumb e ações */}
      <div className="p-4 border-b border-gray-700">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mb-3">
          {generateBreadcrumb().map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <span className="text-gray-500">/</span>}
              <button
                onClick={() => navigateToDirectory(crumb.path)}
                className="text-cyan-400 hover:text-cyan-300 text-sm"
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Ações */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors"
          >
            Nova Pasta
          </button>
          
          <button
            onClick={() => listFiles(currentPath)}
            disabled={loading}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
          
          {selectedItems.length > 0 && (
            <>
              <button
                onClick={clearSelection}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
              >
                Limpar Seleção ({selectedItems.length})
              </button>
            </>
          )}
        </div>

        {/* Input para criar pasta */}
        {showCreateFolder && (
          <div className="mt-3 flex items-center space-x-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta"
              className="flex-1 px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
            >
              Criar
            </button>
            <button
              onClick={() => {
                setShowCreateFolder(false);
                setNewFolderName('');
              }}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <FileUpload onFilesSelected={handleMultipleUpload} />

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-2 p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-hidden">
        <FileList
          items={items}
          loading={loading}
          selectedItems={selectedItems}
          onItemClick={(item) => {
            if (item.type === 'directory') {
              navigateToDirectory(item.path);
            }
          }}
          onItemSelect={toggleItemSelection}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};

export default FileManagerPanel;