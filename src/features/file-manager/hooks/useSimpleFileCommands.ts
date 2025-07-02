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

    const startMarker = `__START_${currentCommand.commandId}__`;
    const endMarker = `__END_${currentCommand.commandId}__`;

    // Só processa se a mensagem contém os marcadores do comando atual
    if (!fullMessage.includes(startMarker) && !fullMessage.includes(endMarker)) {
      return;
    }
    
    console.log(`[FILE CMD] Processing message for ${currentCommand.commandId}, has start: ${fullMessage.includes(startMarker)}, has end: ${fullMessage.includes(endMarker)}`);

    // Atualiza buffer apenas uma vez quando há os dois marcadores
    if (fullMessage.includes(startMarker) && fullMessage.includes(endMarker) && !currentCommand.buffer.includes(endMarker)) {
      currentCommand.buffer = fullMessage;
      console.log(`[FILE CMD] Updated buffer for ${currentCommand.commandId}`);
    }

    // Procura pelo marcador de fim do comando
    if (currentCommand.buffer.includes(endMarker)) {
      const command = commandQueue.current.shift();
      if (command) {
        clearTimeout(command.timeout);
        
        // Extrai resultado entre os marcadores
        // Usa lastIndexOf para pegar a última ocorrência dos marcadores (saída real, não comando)
        const startIndex = command.buffer.lastIndexOf(startMarker);
        const endIndex = command.buffer.lastIndexOf(endMarker);
        
        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
          // Procura pela primeira quebra de linha após o marcador START
          const startMarkerEnd = startIndex + startMarker.length;
          const firstNewlineAfterStart = command.buffer.indexOf('\n', startMarkerEnd);
          
          // Se não encontrar quebra de linha, usa o final do marcador
          const contentStart = firstNewlineAfterStart !== -1 ? firstNewlineAfterStart + 1 : startMarkerEnd;
          
          let result = command.buffer
            .substring(contentStart, endIndex)
            .trim();
          
          // Remove linhas vazias extras no início e fim
          result = result.replace(/^\s*\n+|\n+\s*$/g, '');
          
          // Remove apenas linhas que claramente não são dados de arquivo
          const lines = result.split('\n');
          const cleanLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed && 
                   !trimmed.startsWith('>>>') &&
                   !trimmed.includes('exec(') &&
                   !trimmed.includes('print(');
          });
          
          result = cleanLines.join('\n').trim();
          
          console.log(`[FILE CMD] Command ${command.commandId} completed with result:`, result);
          console.log(`[FILE CMD] Raw extracted content between markers:`, command.buffer.substring(contentStart, endIndex));
          console.log(`[FILE CMD] Start index: ${startIndex}, End index: ${endIndex}, Buffer length: ${command.buffer.length}`);
          console.log(`[FILE CMD] Full buffer:`, command.buffer);
          console.log(`[FILE CMD] Content start position:`, contentStart, 'End position:', endIndex);
          
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
    // Previne execução simultânea de comandos - aguarda se há comando em execução
    while (commandQueue.current.length > 0) {
      console.log(`[FILE CMD] Command queue busy, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 100));
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

      // Envolve comando com marcadores únicos - linha única
      const wrappedCommand = `print("__START_${commandId}__"); ${command}; print("__END_${commandId}__")`;

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
      // Comando super simples em uma linha válida - usando exec() para multilinhas
      const command = `exec("import os\\nfor f in os.ilistdir('${path}'):\\n    print(f[0], f[1], f[3])")`;
      
      const result = await executeCommand(command, 8000);
      
      // Processa resultado linha por linha
      if (typeof result === 'string') {
        const lines = result.split('\n').filter(line => line.trim());
        const files = lines.map(line => {
          const parts = line.trim().split(' ');
          if (parts.length >= 3) {
            const name = parts[0];
            const type = parseInt(parts[1]) === 0x4000 ? 'dir' : 'file';
            const size = parseInt(parts[2]) || 0;
            return { name, type, size };
          }
          return null;
        }).filter(Boolean);
        return files;
      }
      
      return [];
    } catch (error) {
      console.error('ListFiles error:', error);
      // Fallback para uos se os não funcionar
      try {
        console.log('Trying fallback with uos module...');
        const fallbackCommand = `exec("import uos\\nfor f in uos.ilistdir('${path}'):\\n    print(f[0], f[1], f[3])")`;
        
        const fallbackResult = await executeCommand(fallbackCommand, 8000);
        
        if (typeof fallbackResult === 'string') {
          const lines = fallbackResult.split('\n').filter(line => line.trim());
          const files = lines.map(line => {
            const parts = line.trim().split(' ');
            if (parts.length >= 3) {
              const name = parts[0];
              const type = parseInt(parts[1]) === 0x4000 ? 'dir' : 'file';
              const size = parseInt(parts[2]) || 0;
              return { name, type, size };
            }
            return null;
          }).filter(Boolean);
          return files;
        }
        
        return [];
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