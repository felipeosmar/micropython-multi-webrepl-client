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
          let response = callback.buffer.substring(
            startIndex + startMarker.length,
            endIndex
          ).trim();
          
          // Remove quebras de linha extras e limpa a resposta
          response = response.replace(/^\r?\n+|\r?\n+$/g, '').trim();
          
          clearTimeout(callback.timeout);
          responseCallbacks.current.delete(id);
          
          try {
            // Tenta fazer parse se parecer JSON ou lista Python
            if ((response.startsWith('[') && response.endsWith(']')) || 
                (response.startsWith('{') && response.endsWith('}'))) {
              // Converte aspas simples para duplas (Python para JSON)
              const jsonResponse = response
                .replace(/'/g, '"')
                .replace(/True/g, 'true')
                .replace(/False/g, 'false')
                .replace(/None/g, 'null');
              callback.resolve(JSON.parse(jsonResponse));
            } else {
              callback.resolve(response);
            }
          } catch (error) {
            console.warn('Parse error for response:', response, error);
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
      const wrappedCommand = `try:\n    print("__CMD_START_${commandId}__")\n    ${command.replace(/\n/g, '\n    ')}\n    print("__CMD_END_${commandId}__")\nexcept Exception as e:\n    print("__CMD_START_${commandId}__")\n    print("ERROR:", str(e))\n    print("__CMD_END_${commandId}__")`;

      // Envia comando
      sendCommand(wrappedCommand);
    });
  }, [sendCommand]);

  /**
   * Lista arquivos e diretórios
   */
  const listFiles = useCallback(async (path: string = '/') => {
    try {
      // Comando mais simples para teste
      const command = `import uos; items = []; [items.append({'name': item[0], 'type': 'directory' if item[1] == 0x4000 else 'file', 'size': item[3] if item[1] != 0x4000 else 0, 'path': ('/' + item[0]) if '${path}' == '/' else ('${path}/' + item[0])}) for item in uos.ilistdir('${path}')]; print(items)`;
      
      const result = await executeCommand(command, 5000); // 5 segundos timeout
      return result;
    } catch (error) {
      console.error('Error in listFiles:', error);
      return [];
    }
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