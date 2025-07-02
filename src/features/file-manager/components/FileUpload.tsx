import React, { useState, useRef, DragEvent } from 'react';

/**
 * Props do FileUpload
 */
interface FileUploadProps {
  /** Callback quando arquivos são selecionados */
  onFilesSelected: (files: FileList) => void;
  /** Se está processando upload */
  uploading?: boolean;
}

/**
 * Componente para upload de arquivos com drag & drop
 * 
 * Funcionalidades:
 * - Drag & drop de arquivos
 * - Seleção via botão
 * - Upload múltiplo
 * - Indicadores visuais
 */
const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  uploading = false
}) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Manipula evento de drag over
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  /**
   * Manipula evento de drag leave
   */
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  /**
   * Manipula evento de drop
   */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  /**
   * Manipula seleção de arquivos via input
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  /**
   * Abre seletor de arquivos
   */
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  /**
   * Classes CSS baseadas no estado
   */
  const getContainerClasses = (): string => {
    const baseClasses = 'border border-dashed rounded p-2 text-center transition-colors';
    
    if (uploading) {
      return `${baseClasses} border-yellow-500 bg-yellow-900/20 text-yellow-300`;
    }
    
    if (dragOver) {
      return `${baseClasses} border-cyan-400 bg-cyan-900/20 text-cyan-300`;
    }
    
    return `${baseClasses} border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300 cursor-pointer`;
  };

  return (
    <div>
      {/* Input oculto para seleção de arquivos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept=".py,.txt,.json,.md,.html,.css,.js,.yml,.yaml,.xml,.csv"
      />

      {/* Área de drop compacta */}
      <div
        className={getContainerClasses()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!uploading ? openFileSelector : undefined}
      >
        {uploading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
            <p className="text-xs">Uploading...</p>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="text-lg">📁</div>
            <div className="flex-1">
              <p className="text-xs font-medium">
                {dragOver ? 'Solte aqui' : 'Upload'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;