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
    const baseClasses = 'px-2 py-1 hover:bg-gray-700 transition-colors';
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
      {/* Lista de itens compacta */}
      <div>
        {items.map((item) => {
          const isSelected = selectedItems.includes(item.name);
          
          return (
            <div
              key={item.path}
              className={getItemClasses(item, isSelected)}
            >
              {/* Layout compacto em uma única linha */}
              <div className="flex items-center space-x-2 w-full">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onItemSelect(item.name)}
                  className="w-3 h-3 rounded flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Ícone e nome */}
                <div 
                  className="flex-1 flex items-center min-w-0 cursor-pointer"
                  onClick={() => onItemClick(item)}
                >
                  <span className="mr-1 text-sm flex-shrink-0">{getFileIcon(item)}</span>
                  <span className="truncate font-mono text-xs" title={item.name}>
                    {item.name}
                  </span>
                  {item.type === 'directory' && (
                    <span className="ml-1 text-xs text-gray-500 flex-shrink-0">/</span>
                  )}
                </div>

                {/* Tamanho do arquivo */}
                {item.size && (
                  <div className="text-xs text-gray-500 flex-shrink-0 min-w-fit">
                    {formatFileSize(item.size)}
                  </div>
                )}

                {/* Ações compactas */}
                <div className="flex space-x-1 flex-shrink-0">
                  {item.type === 'file' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(item.name);
                      }}
                      className="p-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      title="Download"
                    >
                      ⬇
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.name, item.type === 'directory');
                    }}
                    className="p-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    title="Deletar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileList;