import { useState, useCallback } from 'react';
import { FileSystemItem, FileOperationResult, FileManagerState } from '../types';

/**
 * Hook para operações de arquivo via WebREPL
 * 
 * Funcionalidades:
 * - Listar arquivos e diretórios
 * - Upload de arquivos
 * - Download de arquivos
 * - Deletar arquivos/diretórios
 * - Criar diretórios
 * - Navegar entre diretórios
 */
export const useFileOperations = (
  fileCommands: any // WebReplCommand hook instance
) => {
  const [fileManagerState, setFileManagerState] = useState<FileManagerState>({
    currentPath: '/',
    items: [],
    loading: false,
    error: null,
    selectedItems: []
  });

  /**
   * Normaliza o caminho do arquivo/diretório
   */
  const normalizePath = useCallback((path: string): string => {
    if (path === '/' || path === '') return '/';
    return path.startsWith('/') ? path : `/${path}`;
  }, []);

  /**
   * Lista arquivos e diretórios no caminho especificado
   */
  const listFiles = useCallback(async (path: string = '/'): Promise<FileOperationResult> => {
    if (!fileCommands) {
      return { success: false, error: 'Conexão não disponível' };
    }

    setFileManagerState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const normalizedPath = normalizePath(path);
      const result = await fileCommands.listFiles(normalizedPath);
      
      const items: FileSystemItem[] = Array.isArray(result) ? result.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size || undefined
      })) : [];

      setFileManagerState(prev => ({
        ...prev,
        currentPath: normalizedPath,
        items,
        loading: false
      }));

      return { success: true, data: items };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao listar arquivos';
      setFileManagerState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, [fileCommands, normalizePath]);

  /**
   * Faz upload de um arquivo para o dispositivo
   */
  const uploadFile = useCallback(async (
    fileName: string, 
    fileContent: string | ArrayBuffer,
    targetPath: string = '/'
  ): Promise<FileOperationResult> => {
    if (!fileCommands) {
      return { success: false, error: 'Conexão não disponível' };
    }

    try {
      setFileManagerState(prev => ({ ...prev, loading: true }));

      const normalizedPath = normalizePath(targetPath);
      const fullPath = `${normalizedPath}/${fileName}`.replace('//', '/');
      
      // Converte ArrayBuffer para string se necessário
      let content: string;
      if (fileContent instanceof ArrayBuffer) {
        content = new TextDecoder().decode(fileContent);
      } else {
        content = fileContent;
      }
      
      const result = await fileCommands.writeFile(fullPath, content);
      
      if (result === 'SUCCESS') {
        // Atualiza a lista de arquivos após upload
        await listFiles(fileManagerState.currentPath);
        return { success: true };
      } else {
        throw new Error(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload';
      setFileManagerState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [fileCommands, normalizePath, listFiles, fileManagerState.currentPath]);

  /**
   * Faz download de um arquivo do dispositivo
   */
  const downloadFile = useCallback(async (fileName: string): Promise<FileOperationResult> => {
    if (!fileCommands) {
      return { success: false, error: 'Conexão não disponível' };
    }

    try {
      setFileManagerState(prev => ({ ...prev, loading: true }));

      const normalizedPath = normalizePath(fileName);
      const content = await fileCommands.readFile(normalizedPath);
      
      if (content.startsWith('ERROR:')) {
        throw new Error(content);
      }
      
      setFileManagerState(prev => ({ ...prev, loading: false }));
      
      return { success: true, data: content };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer download';
      setFileManagerState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [fileCommands, normalizePath]);

  /**
   * Deleta um arquivo ou diretório
   */
  const deleteItem = useCallback(async (itemName: string, isDirectory: boolean = false): Promise<FileOperationResult> => {
    if (!fileCommands) {
      return { success: false, error: 'Conexão não disponível' };
    }

    try {
      setFileManagerState(prev => ({ ...prev, loading: true }));

      const result = isDirectory 
        ? await fileCommands.deleteDirectory(itemName)
        : await fileCommands.deleteFile(itemName);
      
      if (result === 'SUCCESS') {
        // Atualiza a lista após deleção
        await listFiles(fileManagerState.currentPath);
        return { success: true };
      } else {
        throw new Error(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar item';
      setFileManagerState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [fileCommands, listFiles, fileManagerState.currentPath]);

  /**
   * Cria um novo diretório
   */
  const createDirectory = useCallback(async (dirName: string): Promise<FileOperationResult> => {
    if (!fileCommands) {
      return { success: false, error: 'Conexão não disponível' };
    }

    try {
      setFileManagerState(prev => ({ ...prev, loading: true }));

      const normalizedPath = normalizePath(`${fileManagerState.currentPath}/${dirName}`);
      const result = await fileCommands.createDirectory(normalizedPath);
      
      if (result === 'SUCCESS') {
        // Atualiza a lista após criação
        await listFiles(fileManagerState.currentPath);
        return { success: true };
      } else {
        throw new Error(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar diretório';
      setFileManagerState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [fileCommands, normalizePath, listFiles, fileManagerState.currentPath]);

  /**
   * Navega para um diretório
   */
  const navigateToDirectory = useCallback(async (path: string): Promise<void> => {
    await listFiles(path);
  }, [listFiles]);

  /**
   * Seleciona/deseleciona itens para operações em lote
   */
  const toggleItemSelection = useCallback((itemName: string) => {
    setFileManagerState(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(itemName)
        ? prev.selectedItems.filter(name => name !== itemName)
        : [...prev.selectedItems, itemName]
    }));
  }, []);

  /**
   * Limpa seleção de itens
   */
  const clearSelection = useCallback(() => {
    setFileManagerState(prev => ({ ...prev, selectedItems: [] }));
  }, []);

  return {
    fileManagerState,
    listFiles,
    uploadFile,
    downloadFile,
    deleteItem,
    createDirectory,
    navigateToDirectory,
    toggleItemSelection,
    clearSelection
  };
};