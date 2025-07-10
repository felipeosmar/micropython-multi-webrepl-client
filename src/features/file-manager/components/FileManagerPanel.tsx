import React, { useEffect, useState } from 'react';
import { useFileOperations } from '../hooks/useFileOperations';
import FileList from './FileList';
import FileUpload from './FileUpload';
import FileEditor from './FileEditor';
import { FolderPlusIcon, RefreshIcon } from '@/components/icons';
import { FileSystemItem } from '@/shared/types';

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
  const [selectedFile, setSelectedFile] = useState<FileSystemItem | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);

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
    console.log('[FILE MANAGER] Effect triggered - isConnected:', isConnected, 'items:', items.length, 'loading:', loading);
    if (isConnected && items.length === 0 && !loading) {
      console.log('[FILE MANAGER] Loading initial file list...');
      // Adiciona um pequeno delay para garantir que a conexão esteja pronta
      setTimeout(() => {
        listFiles('/');
      }, 1000);
    }
  }, [isConnected]); // Removido listFiles da dependência para evitar loops
  
  // Força recarga da lista quando o componente é montado
  useEffect(() => {
    if (isConnected && !loading) {
      console.log('[FILE MANAGER] Component mounted, loading files...');
      listFiles(currentPath);
    }
  }, []); // Executa apenas uma vez quando o componente é montado

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
    console.log(`[UPLOAD] Starting upload of ${files.length} files`);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[UPLOAD] Processing file ${i + 1}/${files.length}: ${file.name}`);
      
      try {
        const reader = new FileReader();
        
        const fileContent = await new Promise<string | ArrayBuffer>((resolve, reject) => {
          reader.onload = (e) => {
            if (e.target?.result) {
              resolve(e.target.result);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(new Error('File read error'));
          reader.readAsText(file); // Usar readAsText em vez de readAsArrayBuffer para melhor compatibilidade
        });
        
        const result = await uploadFile(file.name, fileContent, currentPath);
        
        if (result.success) {
          console.log(`[UPLOAD] Successfully uploaded ${file.name}`);
        } else {
          console.error(`[UPLOAD] Failed to upload ${file.name}:`, result.error);
        }
      } catch (error) {
        console.error(`[UPLOAD] Error processing ${file.name}:`, error);
      }
    }
    
    console.log(`[UPLOAD] Finished processing all files`);
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
   * Abre um arquivo para edição
   */
  const handleOpenFile = async (file: FileSystemItem) => {
    if (file.type !== 'file') return;
    
    setLoadingFile(true);
    try {
      if (fileCommands && fileCommands.readFile) {
        const fullPath = file.path;
        console.log(`[FILE MANAGER] Opening file: ${fullPath}`);
        const content = await fileCommands.readFile(fullPath);
        setFileContent(content);
        setSelectedFile(file);
      }
    } catch (error) {
      console.error('[FILE MANAGER] Error opening file:', error);
      alert(`Erro ao abrir arquivo: ${error}`);
    } finally {
      setLoadingFile(false);
    }
  };

  /**
   * Salva o conteúdo do arquivo
   */
  const handleSaveFile = async (content: string) => {
    if (!selectedFile || !fileCommands || !fileCommands.writeFile) return;
    
    const fullPath = selectedFile.path;
    console.log(`[FILE MANAGER] Saving file: ${fullPath}`);
    
    const result = await fileCommands.writeFile(fullPath, content);
    if (result === 'SUCCESS' || result.includes('SUCCESS')) {
      setFileContent(content);
      // Opcionalmente, recarrega a lista de arquivos para atualizar tamanhos
      await listFiles(currentPath);
    } else {
      throw new Error(result);
    }
  };

  /**
   * Fecha o editor
   */
  const handleCloseEditor = () => {
    setSelectedFile(null);
    setFileContent('');
  };

  // Redefine estado ao perder conexão
  useEffect(() => {
    if (!isConnected) {
      // Limpa itens e redefine o caminho atual
      // Isso evita operações de arquivo em uma conexão inativa
    }
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900">
        <p className="text-sm">Conecte-se para gerenciar arquivos</p>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Editor de arquivo (se houver arquivo selecionado) */}
      {selectedFile ? (
        <div className="flex-1">
          <FileEditor
            selectedFile={selectedFile}
            fileContent={fileContent}
            loading={loadingFile}
            onSave={handleSaveFile}
            onClose={handleCloseEditor}
          />
        </div>
      ) : (
        // Placeholder quando nenhum arquivo está selecionado
        <div className="flex-1 bg-gray-900 flex items-center justify-center text-gray-400">
          <p className="text-sm">Selecione um arquivo para editar</p>
        </div>
      )}
      
      {/* Painel lateral com lista de arquivos */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-gray-900 border-l border-gray-700">
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
              onClick={() => {
                console.log('[FILE MANAGER] Manual refresh clicked');
                listFiles(currentPath);
              }}
              disabled={loading}
              className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Botão de debug temporário */}
            <button
              onClick={async () => {
                console.log('[FILE MANAGER DEBUG] Testing listFiles directly');
                try {
                  if (fileCommands && fileCommands.listFiles) {
                    const files = await fileCommands.listFiles('/');
                    console.log('[FILE MANAGER DEBUG] Files received:', files);
                    alert(`Arquivos encontrados: ${files.length}\n${files.map(f => `${f.name} (${f.type})`).join('\n')}`);
                  }
                } catch (error) {
                  console.error('[FILE MANAGER DEBUG] Error:', error);
                  alert(`Erro: ${error}`);
                }
              }}
              className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors text-xs ml-1"
              title="Debug"
            >
              D
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
      
      {/* Debug Info */}
      <div className="mx-3 mb-2 p-2 bg-gray-700 rounded text-xs text-gray-300">
        <div>Status: {loading ? 'Carregando...' : 'Pronto'}</div>
        <div>Arquivos: {items.length}</div>
        <div>Caminho: {currentPath}</div>
      </div>

        {/* File List */}
        <div className="flex-1 overflow-hidden">
          <FileList
            items={items}
            loading={loading}
            selectedItems={selectedItems}
            onItemClick={(item) => {
              if (item.type === 'directory') {
                navigateToDirectory(item.path);
              } else {
                handleOpenFile(item);
              }
            }}
            onItemSelect={toggleItemSelection}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default FileManagerPanel;