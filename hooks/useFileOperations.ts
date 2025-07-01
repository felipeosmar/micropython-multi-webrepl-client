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
  sendData: (data: string) => Promise<void> | void,
  sendCommand: (command: string) => void
) => {
  const [fileManagerState, setFileManagerState] = useState<FileManagerState>({
    currentPath: '/',
    items: [],
    loading: false,
    error: null,
    selectedItems: []
  });

  /**
   * Executa um comando Python e captura a resposta
   */
  const executeCommand = useCallback(async (command: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout na execução do comando'));
      }, 10000);

      // Criar um listener temporário para capturar a resposta
      const originalSendCommand = sendCommand;
      let response = '';
      
      // Simula captura de resposta - em implementação real, seria necessário
      // modificar o hook useWebRepl para permitir captura de respostas específicas
      sendCommand(command);
      
      clearTimeout(timeout);
      resolve(response);
    });
  }, [sendCommand]);

  /**
   * Lista arquivos e diretórios no caminho especificado
   */
  const listFiles = useCallback(async (path: string = '/'): Promise<FileOperationResult> => {
    setFileManagerState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Comando Python para listar arquivos com informações detalhadas
      const command = `
import uos
try:
    items = []
    for item in uos.ilistdir('${path}'):
        name, type_info, inode, size = item
        item_type = 'directory' if type_info == 0x4000 else 'file'
        items.append({
            'name': name,
            'type': item_type,
            'size': size if item_type == 'file' else None
        })
    print('FILE_LIST_START')
    print(items)
    print('FILE_LIST_END')
except Exception as e:
    print('ERROR:', str(e))
`;

      await executeCommand(command);
      
      // Em uma implementação real, seria necessário parser a resposta
      // Por enquanto, vamos simular alguns arquivos para teste
      const simulatedItems: FileSystemItem[] = [
        {
          name: 'boot.py',
          path: `${path}/boot.py`,
          type: 'file',
          size: 245
        },
        {
          name: 'main.py',
          path: `${path}/main.py`,
          type: 'file',
          size: 1024
        },
        {
          name: 'lib',
          path: `${path}/lib`,
          type: 'directory'
        }
      ];

      setFileManagerState(prev => ({
        ...prev,
        currentPath: path,
        items: simulatedItems,
        loading: false
      }));

      return { success: true, data: simulatedItems };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao listar arquivos';
      setFileManagerState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, [executeCommand]);

  /**
   * Faz upload de um arquivo para o dispositivo
   */
  const uploadFile = useCallback(async (
    fileName: string, 
    fileContent: string | ArrayBuffer,
    targetPath: string = '/'
  ): Promise<FileOperationResult> => {
    try {
      setFileManagerState(prev => ({ ...prev, loading: true }));

      const fullPath = `${targetPath}/${fileName}`.replace('//', '/');
      
      // Simula upload - em implementação real, usaria WebREPL file transfer
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Atualiza a lista de arquivos após upload
      await listFiles(fileManagerState.currentPath);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload';
      setFileManagerState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [listFiles, fileManagerState.currentPath]);

  /**
   * Faz download de um arquivo do dispositivo
   */
  const downloadFile = useCallback(async (fileName: string): Promise<FileOperationResult> => {
    try {
      setFileManagerState(prev => ({ ...prev, loading: true }));

      const command = `
with open('${fileName}', 'rb') as f:
    content = f.read()
    print('FILE_CONTENT_START')
    print(content)
    print('FILE_CONTENT_END')
`;

      await executeCommand(command);
      
      // Simula download
      const simulatedContent = `# Conteúdo simulado do arquivo ${fileName}\nprint("Hello from ${fileName}")`;
      
      setFileManagerState(prev => ({ ...prev, loading: false }));
      
      return { success: true, data: simulatedContent };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer download';
      setFileManagerState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [executeCommand]);

  /**
   * Deleta um arquivo ou diretório
   */
  const deleteItem = useCallback(async (itemName: string, isDirectory: boolean = false): Promise<FileOperationResult> => {
    try {
      setFileManagerState(prev => ({ ...prev, loading: true }));

      const command = isDirectory 
        ? `uos.rmdir('${itemName}')`
        : `uos.remove('${itemName}')`;

      await executeCommand(command);
      
      // Atualiza a lista após deleção
      await listFiles(fileManagerState.currentPath);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar item';
      setFileManagerState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [executeCommand, listFiles, fileManagerState.currentPath]);

  /**
   * Cria um novo diretório
   */
  const createDirectory = useCallback(async (dirName: string): Promise<FileOperationResult> => {
    try {
      setFileManagerState(prev => ({ ...prev, loading: true }));

      const command = `uos.mkdir('${dirName}')`;
      await executeCommand(command);
      
      // Atualiza a lista após criação
      await listFiles(fileManagerState.currentPath);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar diretório';
      setFileManagerState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { success: false, error: errorMessage };
    }
  }, [executeCommand, listFiles, fileManagerState.currentPath]);

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