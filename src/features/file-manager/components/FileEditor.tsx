import React, { useState, useEffect } from 'react';
import { FileSystemItem } from '@/shared/types';

interface FileEditorProps {
  selectedFile: FileSystemItem | null;
  fileContent: string;
  loading: boolean;
  onSave: (content: string) => Promise<void>;
  onClose: () => void;
}

const FileEditor: React.FC<FileEditorProps> = ({
  selectedFile,
  fileContent,
  loading,
  onSave,
  onClose
}) => {
  const [content, setContent] = useState(fileContent);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setContent(fileContent);
    setHasChanges(false);
  }, [fileContent, selectedFile]);

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(content);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(e.target.value !== fileContent);
  };

  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900">
        <p className="text-sm">Selecione um arquivo para editar</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900">
        <p className="text-sm">Carregando arquivo...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header com nome do arquivo e botões */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Editando:</span>
          <span className="text-sm font-mono text-cyan-400">{selectedFile.name}</span>
          {hasChanges && (
            <span className="text-xs text-yellow-400">(modificado)</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white text-sm rounded transition-colors"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Editor de texto */}
      <div className="flex-1 p-2">
        <textarea
          value={content}
          onChange={handleContentChange}
          className="w-full h-full bg-gray-800 text-gray-100 font-mono text-sm p-3 rounded border border-gray-700 focus:border-cyan-500 focus:outline-none resize-none"
          placeholder="Conteúdo do arquivo..."
          spellCheck={false}
        />
      </div>

      {/* Rodapé com informações */}
      <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex justify-between">
        <span>Tamanho: {content.length} caracteres</span>
        <span>Linhas: {content.split('\n').length}</span>
      </div>
    </div>
  );
};

export default FileEditor;