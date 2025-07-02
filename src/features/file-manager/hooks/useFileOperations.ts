import { useState, useCallback } from 'react';
import { FileSystemItem, FileOperationResult, FileManagerState } from '@/shared/types';

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
    setFileManagerState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const normalizedPath = normalizePath(path);
      
      if (!fileCommands || !fileCommands.listFiles) {
        setFileManagerState(prev => ({
          ...prev,
          loading: false,
          error: 'File commands not available'
        }));
        return { success: false, error: 'File commands not available' };
      }

      // Use o comando real do MicroPython
      console.log(`[FILE OPS] Listing files in path: ${normalizedPath}`);
      const items = await fileCommands.listFiles(normalizedPath);
      
      // Converte para formato interno
      const fileSystemItems: FileSystemItem[] = items.map((item: any) => ({
        name: item.name,
        path: `${normalizedPath}/${item.name}`.replace('//', '/'),
        type: item.type === 'dir' ? 'directory' : 'file', // Ajustado para o novo formato
        size: item.size > 0 ? item.size : undefined
      }));

      setFileManagerState(prev => ({
        ...prev,
        currentPath: normalizedPath,
        items: fileSystemItems,
        loading: false
      }));

      return { success: true, data: fileSystemItems };
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
      setFileManagerState(prev => ({ ...prev, loading: true, error: null }));

      const normalizedPath = normalizePath(targetPath);
      const fullPath = `${normalizedPath}/${fileName}`.replace('//', '/');
      
      // Converte ArrayBuffer para string se necessário
      let content: string;
      if (fileContent instanceof ArrayBuffer) {
        content = new TextDecoder().decode(fileContent);
      } else {
        content = fileContent;
      }
      
      console.log(`[FILE UPLOAD] Uploading ${fileName} to ${fullPath}`);
      const result = await fileCommands.writeFile(fullPath, content);
      
      if (result === 'SUCCESS' || result.includes('SUCCESS')) {
        console.log(`[FILE UPLOAD] Successfully uploaded ${fileName}`);
        // Atualiza a lista de arquivos após upload
        await listFiles(fileManagerState.currentPath);
        setFileManagerState(prev => ({ ...prev, loading: false }));
        return { success: true };
      } else {
        throw new Error(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload';
      console.error(`[FILE UPLOAD] Error uploading ${fileName}:`, errorMessage);
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
      setFileManagerState(prev => ({ ...prev, loading: true, error: null }));

      // Constrói o caminho completo do arquivo
      const fullPath = `${fileManagerState.currentPath}/${fileName}`.replace('//', '/');
      console.log(`[FILE DOWNLOAD] Downloading file: ${fullPath}`);
      
      const content = await fileCommands.readFile(fullPath);
      
      if (typeof content === 'string' && content.startsWith('ERROR:')) {
        throw new Error(content);
      }
      
      console.log(`[FILE DOWNLOAD] Successfully downloaded ${fileName}, size: ${content.length} characters`);
      setFileManagerState(prev => ({ ...prev, loading: false }));
      
      return { success: true, data: content };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer download';
      console.error(`[FILE DOWNLOAD] Error downloading ${fileName}:`, errorMessage);
      setFileManagerState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [fileCommands, fileManagerState.currentPath]);

  /**
   * Deleta um arquivo ou diretório
   */
  const deleteItem = useCallback(async (itemName: string, isDirectory: boolean = false): Promise<FileOperationResult> => {
    if (!fileCommands) {
      return { success: false, error: 'Conexão não disponível' };
    }

    try {
      setFileManagerState(prev => ({ ...prev, loading: true, error: null }));

      // Constrói o caminho completo do item
      const fullPath = `${fileManagerState.currentPath}/${itemName}`.replace('//', '/');
      console.log(`[FILE DELETE] Deleting ${isDirectory ? 'directory' : 'file'}: ${fullPath}`);
      
      const result = isDirectory 
        ? await fileCommands.deleteDirectory(fullPath)
        : await fileCommands.deleteFile(fullPath);
      
      if (result === 'SUCCESS' || result.includes('SUCCESS')) {
        console.log(`[FILE DELETE] Successfully deleted ${itemName}`);
        // Atualiza a lista após deleção
        await listFiles(fileManagerState.currentPath);
        setFileManagerState(prev => ({ ...prev, loading: false }));
        return { success: true };
      } else {
        throw new Error(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar item';
      console.error(`[FILE DELETE] Error deleting ${itemName}:`, errorMessage);
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
      setFileManagerState(prev => ({ ...prev, loading: true, error: null }));

      const normalizedPath = normalizePath(`${fileManagerState.currentPath}/${dirName}`);
      console.log(`[FILE MKDIR] Creating directory: ${normalizedPath}`);
      
      const result = await fileCommands.createDirectory(normalizedPath);
      
      if (result === 'SUCCESS' || result.includes('SUCCESS')) {
        console.log(`[FILE MKDIR] Successfully created directory ${dirName}`);
        // Atualiza a lista após criação
        await listFiles(fileManagerState.currentPath);
        setFileManagerState(prev => ({ ...prev, loading: false }));
        return { success: true };
      } else {
        throw new Error(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar diretório';
      console.error(`[FILE MKDIR] Error creating directory ${dirName}:`, errorMessage);
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