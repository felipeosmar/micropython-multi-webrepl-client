import React from 'react';
import { FileSystemItem } from '../types';

/**
 * Props do FileList
 */
interface FileListProps {
  /** Lista de itens para exibir */
  items: FileSystemItem[];
  /** Se está carregando */
  loading: boolean;
  /** Itens selecionados */
  selectedItems: string[];
  /** Callback quando um item é clicado */
  onItemClick: (item: FileSystemItem) => void;
  /** Callback para seleção de item */
  onItemSelect: (itemName: string) => void;
  /** Callback para download */
  onDownload: (fileName: string) => void;
  /** Callback para deletar */
  onDelete: (itemName: string, isDirectory: boolean) => void;
}

/**
 * Componente para listar arquivos e diretórios
 * 
 * Funcionalidades:
 * - Lista arquivos e pastas
 * - Seleção múltipla
 * - Ações contextuais (download, delete)
 * - Indicadores visuais para tipos de arquivo
 */
const FileList: React.FC<FileListProps> = ({
  items,
  loading,
  selectedItems,
  onItemClick,
  onItemSelect,
  onDownload,
  onDelete
}) => {
  /**
   * Formata o tamanho do arquivo para exibição
   */
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Retorna ícone baseado no tipo de arquivo
   */
  const getFileIcon = (item: FileSystemItem): string => {
    if (item.type === 'directory') return '📁';
    
    const extension = item.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'py': return '🐍';
      case 'txt': return '📄';
      case 'json': return '📋';
      case 'md': return '📝';
      case 'html': return '🌐';
      case 'css': return '🎨';
      case 'js': return '⚡';
      default: return '📄';
    }
  };

  /**
   * Retorna classe CSS baseada no tipo de arquivo
   */
  const getItemClasses = (item: FileSystemItem, isSelected: boolean): string => {
    const baseClasses = 'flex items-center px-4 py-2 hover:bg-gray-700 cursor-pointer transition-colors';
    const selectedClasses = isSelected ? 'bg-cyan-900/50 border-l-2 border-cyan-400' : '';
    const typeClasses = item.type === 'directory' ? 'text-cyan-300' : 'text-gray-300';
    
    return `${baseClasses} ${selectedClasses} ${typeClasses}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-400">Carregando arquivos...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-400">Nenhum arquivo encontrado</div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {/* Header da tabela */}
      <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 py-2 text-xs text-gray-400 font-semibold">
        <div className="flex items-center">
          <div className="flex-1">Nome</div>
          <div className="w-20 text-right">Tamanho</div>
          <div className="w-24 text-center">Ações</div>
        </div>
      </div>

      {/* Lista de itens */}
      <div>
        {items.map((item) => {
          const isSelected = selectedItems.includes(item.name);
          
          return (
            <div
              key={item.path}
              className={getItemClasses(item, isSelected)}
            >
              {/* Checkbox para seleção */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onItemSelect(item.name)}
                className="mr-3 rounded"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Conteúdo principal do item */}
              <div 
                className="flex-1 flex items-center min-w-0"
                onClick={() => onItemClick(item)}
              >
                <span className="mr-2 text-lg">{getFileIcon(item)}</span>
                <span className="truncate font-mono text-sm">{item.name}</span>
                {item.type === 'directory' && (
                  <span className="ml-2 text-xs text-gray-500">/</span>
                )}
              </div>

              {/* Tamanho */}
              <div className="w-20 text-right text-xs text-gray-400">
                {formatFileSize(item.size)}
              </div>

              {/* Ações */}
              <div className="w-24 flex justify-center space-x-1">
                {item.type === 'file' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(item.name);
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    title="Download"
                  >
                    ⬇️
                  </button>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.name, item.type === 'directory');
                  }}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                  title="Deletar"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileList;