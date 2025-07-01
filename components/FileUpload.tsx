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
    const baseClasses = 'border-2 border-dashed rounded-lg p-4 m-4 text-center transition-colors';
    
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

      {/* Área de drop */}
      <div
        className={getContainerClasses()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!uploading ? openFileSelector : undefined}
      >
        {uploading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
            <p className="text-sm">Fazendo upload...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="text-3xl">📁</div>
            <div>
              <p className="text-sm font-medium">
                {dragOver ? 'Solte os arquivos aqui' : 'Clique ou arraste arquivos aqui'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Suporta: .py, .txt, .json, .md, .html, .css, .js, .yml, .xml, .csv
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instruções adicionais */}
      {!uploading && (
        <div className="mx-4 mb-2">
          <p className="text-xs text-gray-500 text-center">
            💡 Dica: Você pode selecionar múltiplos arquivos de uma vez
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;