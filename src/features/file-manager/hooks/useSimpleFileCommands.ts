import { useCallback, useRef } from 'react';

/**
 * Hook simples para comandos de arquivo que não interfere com o terminal
 * Usa comandos Python normais sem raw-paste mode
 */
export const useSimpleFileCommands = (
  sendCommand: (command: string) => void
) => {
  const commandQueue = useRef<{
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    commandId: string;
    buffer: string;
    isActive: boolean;
  }[]>([]);
  
  const lastProcessedLength = useRef(0);

  /**
   * Processa mensagens recebidas, apenas para comandos de arquivo
   */
  const processMessage = useCallback((fullMessage: string) => {
    if (commandQueue.current.length === 0) {
      // Reset contador quando não há comandos ativos
      lastProcessedLength.current = fullMessage.length;
      return;
    }

    const currentCommand = commandQueue.current[0];
    if (!currentCommand || !currentCommand.isActive) return;

    // Verifica se há novo conteúdo para processar
    if (fullMessage.length <= lastProcessedLength.current) return;
    
    // Pega apenas o novo conteúdo
    const newContent = fullMessage.substring(lastProcessedLength.current);
    
    // Só processa se contém marcadores do nosso sistema ou se já estamos rastreando um comando
    const hasOurMarkers = newContent.includes('__START_') || newContent.includes('__END_') || currentCommand.buffer.length > 0;
    if (!hasOurMarkers) {
      lastProcessedLength.current = fullMessage.length;
      return;
    }
    
    lastProcessedLength.current = fullMessage.length;

    // Adiciona o novo conteúdo ao buffer do comando
    currentCommand.buffer += newContent;

    // Procura pelo marcador de fim do comando
    const endMarker = `__END_${currentCommand.commandId}__`;
    
    if (currentCommand.buffer.includes(endMarker)) {
      const command = commandQueue.current.shift();
      if (command) {
        clearTimeout(command.timeout);
        
        // Extrai resultado entre os marcadores
        const startMarker = `__START_${command.commandId}__`;
        const startIndex = command.buffer.indexOf(startMarker);
        const endIndex = command.buffer.indexOf(endMarker);
        
        if (startIndex !== -1 && endIndex !== -1) {
          let result = command.buffer
            .substring(startIndex + startMarker.length, endIndex)
            .trim();
          
          // Remove linhas vazias extras
          result = result.replace(/^\s*\n+|\n+\s*$/g, '');
          
          console.log(`[FILE CMD] Command ${command.commandId} completed with result:`, result);
          
          try {
            // Tenta parsear como JSON se parece com estrutura de dados Python
            if ((result.startsWith('[') && result.endsWith(']')) || 
                (result.startsWith('{') && result.endsWith('}'))) {
              const jsonResult = result
                .replace(/'/g, '"')
                .replace(/True/g, 'true')
                .replace(/False/g, 'false')
                .replace(/None/g, 'null');
              command.resolve(JSON.parse(jsonResult));
            } else {
              command.resolve(result);
            }
          } catch (parseError) {
            console.log(`[FILE CMD] JSON parse failed, returning raw result:`, result);
            command.resolve(result);
          }
        } else {
          console.error(`[FILE CMD] Invalid response format for command ${command.commandId}`);
          command.reject(new Error('Invalid response format'));
        }
      }
    }
  }, []);

  /**
   * Executa comando simples usando print statements
   */
  const executeCommand = useCallback(async (
    command: string,
    timeoutMs: number = 3000
  ): Promise<any> => {
    // Previne execução simultânea de comandos
    if (commandQueue.current.length > 0) {
      console.log(`[FILE CMD] Command queue busy, rejecting new command`);
      throw new Error('Another file command is already executing');
    }

    return new Promise((resolve, reject) => {
      const commandId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      console.log(`[FILE CMD] Executing command ${commandId}: ${command.substring(0, 100)}...`);
      
      const timeout = setTimeout(() => {
        // Remove da queue se timeout
        const index = commandQueue.current.findIndex(cmd => cmd.commandId === commandId);
        if (index !== -1) {
          console.log(`[FILE CMD] Command ${commandId} timed out after ${timeoutMs}ms`);
          commandQueue.current[index].isActive = false;
          commandQueue.current.splice(index, 1);
        }
        reject(new Error(`Command timeout: ${command.substring(0, 50)}...`));
      }, timeoutMs);

      commandQueue.current.push({
        resolve,
        reject,
        timeout,
        commandId,
        buffer: '',
        isActive: true
      });

      // Envolve comando com marcadores únicos - tenta manter simples
      const wrappedCommand = `print("__START_${commandId}__");${command.replace(/\n/g, ';')};print("__END_${commandId}__")`;

      // Envia comando normalmente pelo terminal
      console.log(`[FILE CMD] Sending wrapped command for ${commandId}`);
      sendCommand(wrappedCommand);
    });
  }, [sendCommand]);

  /**
   * Lista arquivos usando comando Python simples com módulo 'os' moderno
   */
  const listFiles = useCallback(async (path: string = '/'): Promise<any[]> => {
    try {
      // Comando atualizado para usar 'os' em vez de 'uos' (MicroPython moderno)
      const command = `import os; files = []; [files.append({'name': f[0], 'type': 'dir' if f[1] == 0x4000 else 'file', 'size': f[3] if f[1] != 0x4000 else 0}) for f in os.ilistdir('${path}')]; print(files)`;
      
      const result = await executeCommand(command, 8000);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('ListFiles error:', error);
      // Fallback para uos se os não funcionar (versões antigas)
      try {
        console.log('Trying fallback with uos module...');
        const fallbackCommand = `import uos; files = []; [files.append({'name': f[0], 'type': 'dir' if f[1] == 0x4000 else 'file', 'size': f[3] if f[1] != 0x4000 else 0}) for f in uos.ilistdir('${path}')]; print(files)`;
        const fallbackResult = await executeCommand(fallbackCommand, 8000);
        return Array.isArray(fallbackResult) ? fallbackResult : [];
      } catch (fallbackError) {
        console.error('Both os and uos failed:', fallbackError);
        return [];
      }
    }
  }, [executeCommand]);

  /**
   * Lê conteúdo de um arquivo
   */
  const readFile = useCallback(async (filePath: string): Promise<string> => {
    try {
      const command = `with open('${filePath}', 'r') as f: content = f.read(); print(repr(content))`;
      
      const result = await executeCommand(command, 8000);
      
      if (typeof result === 'string' && result.startsWith('ERROR:')) {
        throw new Error(result);
      }
      
      // Remove aspas extras do repr()
      if (typeof result === 'string' && result.startsWith("'") && result.endsWith("'")) {
        return result.slice(1, -1).replace(/\\'/g, "'").replace(/\\n/g, '\n');
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }, [executeCommand]);

  /**
   * Escreve conteúdo em um arquivo
   */
  const writeFile = useCallback(async (filePath: string, content: string): Promise<string> => {
    try {
      const escapedContent = content.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
      const command = `with open('${filePath}', 'w') as f: f.write('${escapedContent}'); print("SUCCESS")`;
      
      const result = await executeCommand(command, 8000);
      return result;
    } catch (error) {
      return `ERROR: ${error}`;
    }
  }, [executeCommand]);

  /**
   * Cria um diretório usando módulo 'os' moderno
   */
  const createDirectory = useCallback(async (dirPath: string): Promise<string> => {
    try {
      const command = `import os; os.mkdir('${dirPath}'); print("SUCCESS")`;
      const result = await executeCommand(command, 5000);
      return result;
    } catch (error) {
      // Fallback para uos se necessário
      try {
        const fallbackCommand = `import uos; uos.mkdir('${dirPath}'); print("SUCCESS")`;
        const fallbackResult = await executeCommand(fallbackCommand, 5000);
        return fallbackResult;
      } catch (fallbackError) {
        return `ERROR: ${error}`;
      }
    }
  }, [executeCommand]);

  /**
   * Deleta um arquivo usando módulo 'os' moderno
   */
  const deleteFile = useCallback(async (filePath: string): Promise<string> => {
    try {
      const command = `import os; os.remove('${filePath}'); print("SUCCESS")`;
      const result = await executeCommand(command, 5000);
      return result;
    } catch (error) {
      // Fallback para uos se necessário
      try {
        const fallbackCommand = `import uos; uos.remove('${filePath}'); print("SUCCESS")`;
        const fallbackResult = await executeCommand(fallbackCommand, 5000);
        return fallbackResult;
      } catch (fallbackError) {
        return `ERROR: ${error}`;
      }
    }
  }, [executeCommand]);

  /**
   * Deleta um diretório usando módulo 'os' moderno
   */
  const deleteDirectory = useCallback(async (dirPath: string): Promise<string> => {
    try {
      const command = `import os; os.rmdir('${dirPath}'); print("SUCCESS")`;
      const result = await executeCommand(command, 5000);
      return result;
    } catch (error) {
      // Fallback para uos se necessário
      try {
        const fallbackCommand = `import uos; uos.rmdir('${dirPath}'); print("SUCCESS")`;
        const fallbackResult = await executeCommand(fallbackCommand, 5000);
        return fallbackResult;
      } catch (fallbackError) {
        return `ERROR: ${error}`;
      }
    }
  }, [executeCommand]);

  return {
    processMessage,
    executeCommand,
    listFiles,
    readFile,
    writeFile,
    createDirectory,
    deleteFile,
    deleteDirectory
  };
};