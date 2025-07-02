import { useCallback, useRef } from 'react';

/**
 * Hook para executar comandos no WebREPL e capturar respostas
 * 
 * Funcionalidades:
 * - Executa comandos Python no MicroPython
 * - Captura respostas específicas usando marcadores
 * - Sistema de timeout para comandos
 * - Parse de dados estruturados
 */
export const useWebReplCommand = (
  sendData: (data: string) => void,
  sendCommand: (command: string) => void
) => {
  const responseCallbacks = useRef<Map<string, {
    resolve: (data: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    buffer: string;
  }>>(new Map());

  /**
   * Processa mensagens recebidas do WebREPL para comandos específicos
   */
  const processMessage = useCallback((message: string) => {
    responseCallbacks.current.forEach((callback, id) => {
      callback.buffer += message;
      
      // Verifica se a resposta do comando foi completada
      if (callback.buffer.includes(`__CMD_END_${id}__`)) {
        const startMarker = `__CMD_START_${id}__`;
        const endMarker = `__CMD_END_${id}__`;
        
        const startIndex = callback.buffer.indexOf(startMarker);
        const endIndex = callback.buffer.indexOf(endMarker);
        
        if (startIndex !== -1 && endIndex !== -1) {
          const response = callback.buffer.substring(
            startIndex + startMarker.length,
            endIndex
          ).trim();
          
          clearTimeout(callback.timeout);
          responseCallbacks.current.delete(id);
          
          try {
            // Tenta fazer parse se parecer JSON
            if (response.startsWith('[') || response.startsWith('{')) {
              callback.resolve(JSON.parse(response));
            } else {
              callback.resolve(response);
            }
          } catch (error) {
            callback.resolve(response);
          }
        }
      }
    });
  }, []);

  /**
   * Executa um comando Python e retorna a resposta
   */
  const executeCommand = useCallback(async (
    command: string,
    timeoutMs: number = 10000
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const commandId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      // Configura timeout
      const timeout = setTimeout(() => {
        responseCallbacks.current.delete(commandId);
        reject(new Error(`Command timeout: ${command}`));
      }, timeoutMs);

      // Registra callback para resposta
      responseCallbacks.current.set(commandId, {
        resolve,
        reject,
        timeout,
        buffer: ''
      });

      // Monta comando com marcadores para capturar resposta
      const wrappedCommand = `
try:
    print("__CMD_START_${commandId}__")
    ${command}
    print("__CMD_END_${commandId}__")
except Exception as e:
    print("__CMD_START_${commandId}__")
    print("ERROR:", str(e))
    print("__CMD_END_${commandId}__")
`;

      // Envia comando
      sendCommand(wrappedCommand);
    });
  }, [sendCommand]);

  /**
   * Lista arquivos e diretórios
   */
  const listFiles = useCallback(async (path: string = '/') => {
    const command = `
import uos
items = []
try:
    for item in uos.ilistdir('${path}'):
        name, type_info, inode, size = item
        item_type = 'directory' if type_info == 0x4000 else 'file'
        items.append({
            'name': name,
            'type': item_type,
            'size': size if item_type == 'file' else 0,
            'path': '${path}/' + name if '${path}' != '/' else '/' + name
        })
    print(items)
except Exception as e:
    print("[]")
`;
    
    return await executeCommand(command);
  }, [executeCommand]);

  /**
   * Lê conteúdo de um arquivo
   */
  const readFile = useCallback(async (filePath: string) => {
    const command = `
try:
    with open('${filePath}', 'r') as f:
        content = f.read()
    print(repr(content))
except Exception as e:
    print("ERROR:", str(e))
`;
    
    const result = await executeCommand(command);
    
    // Remove as aspas e processa caracteres escapados
    if (typeof result === 'string' && result.startsWith("'") && result.endsWith("'")) {
      return result.slice(1, -1)
        .replace(/\\\\n/g, '\n')
        .replace(/\\\\r/g, '\r')
        .replace(/\\\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\'/g, "'");
    }
    
    return result;
  }, [executeCommand]);

  /**
   * Escreve conteúdo em um arquivo
   */
  const writeFile = useCallback(async (filePath: string, content: string) => {
    // Escapa o conteúdo para Python
    const escapedContent = content
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    const command = `
try:
    with open('${filePath}', 'w') as f:
        f.write('${escapedContent}')
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
`;
    
    return await executeCommand(command);
  }, [executeCommand]);

  /**
   * Deleta um arquivo
   */
  const deleteFile = useCallback(async (filePath: string) => {
    const command = `
try:
    uos.remove('${filePath}')
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
`;
    
    return await executeCommand(command);
  }, [executeCommand]);

  /**
   * Deleta um diretório
   */
  const deleteDirectory = useCallback(async (dirPath: string) => {
    const command = `
try:
    uos.rmdir('${dirPath}')
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
`;
    
    return await executeCommand(command);
  }, [executeCommand]);

  /**
   * Cria um diretório
   */
  const createDirectory = useCallback(async (dirPath: string) => {
    const command = `
try:
    uos.mkdir('${dirPath}')
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
`;
    
    return await executeCommand(command);
  }, [executeCommand]);

  return {
    executeCommand,
    processMessage,
    listFiles,
    readFile,
    writeFile,
    deleteFile,
    deleteDirectory,
    createDirectory
  };
};