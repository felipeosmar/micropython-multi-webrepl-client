import React, { useEffect, useState } from 'react';
import { useFileOperations } from '../hooks/useFileOperations';
import FileList from './FileList';
import FileUpload from './FileUpload';
import { FolderPlusIcon } from './icons/FolderPlusIcon';
import { RefreshIcon } from './icons/RefreshIcon';

/**
 * Props do FileManagerPanel
 */
interface FileManagerPanelProps {
  /** Hook de comandos WebREPL */
  fileCommands: any;
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
  fileCommands,
  isConnected
}) => {
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [debugMode, setDebugMode] = useState(false);

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
  } = useFileOperations(fileCommands);

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

  /**
   * Testa comando simples no WebREPL
   */
  const testSimpleCommand = async () => {
    if (fileCommands && fileCommands.executeCommand) {
      try {
        console.log('Testing simple command...');
        const result = await fileCommands.executeCommand('print("Hello from MicroPython!")', 2000);
        console.log('Command result:', result);
        
        // Agora testa listagem
        console.log('Testing list command...');
        const listResult = await fileCommands.listFiles('/');
        console.log('List result:', listResult);
      } catch (error) {
        console.error('Test command failed:', error);
      }
    }
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900">
        <p className="text-sm">Conecte-se para gerenciar arquivos</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      {/* Header compacto */}
      <div className="p-3 border-b border-gray-700">
        {/* Breadcrumb compacto */}
        <div className="flex items-center space-x-1 mb-2 text-xs">
          {generateBreadcrumb().map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <span className="text-gray-500">/</span>}
              <button
                onClick={() => navigateToDirectory(crumb.path)}
                className="text-cyan-400 hover:text-cyan-300 truncate max-w-[80px]"
                title={crumb.name}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Ações com apenas ícones */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="p-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
              title="Nova Pasta"
            >
              <FolderPlusIcon className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => listFiles(currentPath)}
              disabled={loading}
              className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={testSimpleCommand}
              className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
              title="Testar Comando"
            >
              🔧
            </button>
          </div>
          
          {selectedItems.length > 0 && (
            <button
              onClick={clearSelection}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
              title={`Limpar seleção de ${selectedItems.length} itens`}
            >
              {selectedItems.length}
            </button>
          )}
        </div>

        {/* Input para criar pasta */}
        {showCreateFolder && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta"
              className="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-cyan-500 focus:outline-none text-xs"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex space-x-1">
              <button
                onClick={handleCreateFolder}
                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex-1"
              >
                Criar
              </button>
              <button
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Area compacta */}
      <div className="px-3 py-2">
        <FileUpload onFilesSelected={handleMultipleUpload} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-3 mb-2 p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-xs">
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