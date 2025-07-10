import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook simples para comandos de arquivo que não interfere com o terminal
 * Usa comandos Python normais sem raw-paste mode
 */
export const useSimpleFileCommands = (
  sendCommand: (command: string) => void,
  isConnected?: boolean
) => {
  const commandQueueRef = useRef<{
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    commandId: string;
    buffer: string;
    isActive: boolean;
  }[]>([]);
  const isExecutingRef = useRef(false);
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearQueue = useCallback(() => {
    console.log('[FILE CMD] Clearing command queue...');
    commandQueueRef.current.forEach(cmd => {
      clearTimeout(cmd.timeout);
      cmd.reject(new Error('Command queue cleared.'));
    });
    commandQueueRef.current = [];
    isExecutingRef.current = false;
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isConnected) {
      clearQueue();
    }
  }, [isConnected, clearQueue]);

  /**
   * Processa mensagens recebidas, apenas para comandos de arquivo
   */
  const processMessage = useCallback((fullMessage: string) => {
    if (commandQueueRef.current.length === 0) {
      // Reset contador quando não há comandos ativos
      return;
    }

    const currentCommand = commandQueueRef.current[0];
    if (!currentCommand || !currentCommand.isActive) return;

    const startMarker = `__START_${currentCommand.commandId}__`;
    const endMarker = `__END_${currentCommand.commandId}__`;

    // Só processa se a mensagem contém os marcadores do comando atual
    if (!fullMessage.includes(startMarker) && !fullMessage.includes(endMarker)) {
      return;
    }
    
    console.log(`[FILE CMD] Processing message for ${currentCommand.commandId}, has start: ${fullMessage.includes(startMarker)}, has end: ${fullMessage.includes(endMarker)}`);

    // Atualiza buffer com a mensagem completa
    currentCommand.buffer = fullMessage;
    console.log(`[FILE CMD] Updated buffer for ${currentCommand.commandId}`);
    console.log(`[FILE CMD] Buffer content:`, fullMessage.substring(fullMessage.length - 200)); // Últimos 200 chars

    // Procura pelo marcador de fim do comando
    // Verifica também se o endMarker está presente mesmo que colado com dados
    const hasEndMarker = fullMessage.includes(endMarker) || fullMessage.match(new RegExp(`__END_${currentCommand.commandId}__`));
    
    if (fullMessage.includes(startMarker) && hasEndMarker) {
      console.log(`[FILE CMD] Both markers found for ${currentCommand.commandId}!`);
      const command = commandQueueRef.current.shift();
      if (command) {
        clearTimeout(command.timeout);
        
        // Extrai resultado entre os marcadores
        // Usa lastIndexOf para pegar a última ocorrência dos marcadores (saída real, não comando)
        const startIndex = command.buffer.lastIndexOf(startMarker);
        let endIndex = command.buffer.lastIndexOf(endMarker);
        
        // Verifica se o endMarker está colado com dados (como "__ENDboot.py")
        if (endIndex === -1) {
          // Procura por padrão onde o marcador END está colado com dados
          const endMarkerRegex = new RegExp(`__END_${commandId}__`);
          const match = command.buffer.match(endMarkerRegex);
          if (match && match.index !== undefined) {
            endIndex = match.index;
            console.log(`[FILE CMD] Found END marker at index ${endIndex} (was concatenated with data)`);
          }
        }
        
        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
          // Procura pela primeira quebra de linha após o marcador START
          const startMarkerEnd = startIndex + startMarker.length;
          const firstNewlineAfterStart = command.buffer.indexOf('\n', startMarkerEnd);
          
          // Se não encontrar quebra de linha, usa o final do marcador
          const contentStart = firstNewlineAfterStart !== -1 ? firstNewlineAfterStart + 1 : startMarkerEnd;
          
          // Garante que contentStart não seja maior que endIndex
          const safeContentStart = Math.min(contentStart, endIndex);
          
          let result = command.buffer
            .substring(safeContentStart, endIndex)
            .trim();
          
          // Remove linhas vazias extras no início e fim
          result = result.replace(/^\s*\n+|\n+\s*$/g, '');
          
          // Para comandos de arquivo que retornam conteúdo (readFile), preserva tudo
          // Para comandos de listagem, filtra linhas de comando
          const lines = result.split('\n');
          const cleanLines = lines.filter(line => {
            const trimmed = line.trim();
            // Se a linha começa com aspas, é conteúdo de arquivo
            if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
              return true;
            }
            // Remove apenas linhas de comando, não dados
            return trimmed && 
                   !trimmed.startsWith('>>>') &&
                   !trimmed.includes('exec(') &&
                   !trimmed.includes('print("__') &&
                   !trimmed.includes('import time') &&
                   !trimmed.includes('import sys');
          });
          
          result = cleanLines.join('\n').trim();
          
          // Se o resultado está vazio mas temos dados no buffer após o END marker
          if (!result && endIndex < command.buffer.length - endMarker.length) {
            // Tenta extrair dados que possam estar colados após o marcador END
            const dataAfterEnd = command.buffer.substring(endIndex + endMarker.length).trim();
            if (dataAfterEnd) {
              console.log(`[FILE CMD] Found data after END marker: ${dataAfterEnd.substring(0, 50)}...`);
              result = dataAfterEnd.split('\n')[0]; // Pega a primeira linha após o marcador
            }
          }
          
          console.log(`[FILE CMD] Command ${command.commandId} completed with result:`, result);
          console.log(`[FILE CMD] Raw extracted content between markers:`, command.buffer.substring(safeContentStart, endIndex));
          console.log(`[FILE CMD] Start index: ${startIndex}, End index: ${endIndex}, Buffer length: ${command.buffer.length}`);
          console.log(`[FILE CMD] Full buffer:`, command.buffer);
          console.log(`[FILE CMD] Content start position:`, safeContentStart, 'End position:', endIndex);
          
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
    // Verifica se há conexão antes de executar comando
    if (isConnected === false) {
      console.log(`[FILE CMD] Skipping command - not connected: ${command.substring(0, 50)}...`);
      throw new Error('Not connected - cannot execute file commands');
    }
    
    // Limita tempo de espera na fila para evitar travar para sempre
    const maxWaitTime = 5000; // 5 segundos máximo esperando na fila
    const startWaitTime = Date.now();
    
    // Previne execução simultânea de comandos - aguarda se há comando em execução
    while (commandQueueRef.current.length > 0) {
      // Verifica se já esperou tempo demais
      if (Date.now() - startWaitTime > maxWaitTime) {
        console.log(`[FILE CMD] Queue wait timeout, clearing stuck commands...`);
        // Limpa comandos presos na fila
        commandQueueRef.current.forEach(cmd => {
          clearTimeout(cmd.timeout);
          cmd.reject(new Error('Queue timeout - connection may be lost'));
        });
        commandQueueRef.current = [];
        break;
      }
      
      console.log(`[FILE CMD] Command queue busy, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Promise((resolve, reject) => {
      const commandId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      console.log(`[FILE CMD] Executing command ${commandId}: ${command.substring(0, 100)}...`);
      
      const timeout = setTimeout(() => {
        // Remove da queue se timeout
        const index = commandQueueRef.current.findIndex(cmd => cmd.commandId === commandId);
        if (index !== -1) {
          console.log(`[FILE CMD] Command ${commandId} timed out after ${timeoutMs}ms`);
          commandQueueRef.current[index].isActive = false;
          commandQueueRef.current.splice(index, 1);
        }
        reject(new Error(`Command timeout: ${command.substring(0, 50)}...`));
      }, timeoutMs);

      commandQueueRef.current.push({
        resolve,
        reject,
        timeout,
        commandId,
        buffer: '',
        isActive: true
      });

      try {
        // Para comandos de leitura de arquivo, usa uma abordagem mais simples
        if (command.includes('with open(') && command.includes('repr(content)')) {
          // Comando de leitura de arquivo - não adiciona delays para evitar problemas
          const wrappedCommand = `print("__START_${commandId}__"); ${command}; print("__END_${commandId}__")`;
          console.log(`[FILE CMD] Sending file read command for ${commandId}`);
          sendCommand(wrappedCommand);
        } else if (command.includes('exec(') && command.includes('os.ilistdir')) {
          // Comando de listagem de arquivos - precisa de tratamento especial
          const wrappedCommand = `print("__START_${commandId}__"); ${command}; print("__END_${commandId}__")`;
          console.log(`[FILE CMD] Sending file list command for ${commandId}`);
          sendCommand(wrappedCommand);
        } else {
          // Outros comandos
          const wrappedCommand = `print("__START_${commandId}__"); ${command}; print("__END_${commandId}__")`;
          console.log(`[FILE CMD] Sending generic command for ${commandId}`);
          sendCommand(wrappedCommand);
        }
      } catch (error) {
        // Se falhar ao enviar comando, remove da fila e rejeita
        const index = commandQueueRef.current.findIndex(cmd => cmd.commandId === commandId);
        if (index !== -1) {
          clearTimeout(commandQueueRef.current[index].timeout);
          commandQueueRef.current.splice(index, 1);
        }
        reject(new Error(`Failed to send command: ${error}`));
      }
    });
  }, [sendCommand, isConnected]);

  /**
   * Lista arquivos usando comando Python simples com módulo 'os' moderno
   */
  const listFiles = useCallback(async (path: string = '/'): Promise<any[]> => {
    try {
      // Usa uma abordagem diferente com print separado para evitar concatenação
      const command = `exec("import os\\nfiles = []\\nfor f in os.ilistdir('${path}'):\\n    files.append((f[0], f[1], f[3]))\\nfor f in files:\\n    print(f[0], f[1], f[2])")`;
      
      const result = await executeCommand(command, 8000);
      
      console.log(`[FILE CMD] listFiles raw result:`, result);
      
      // Processa resultado linha por linha
      if (typeof result === 'string') {
        const lines = result.split('\n').filter(line => line.trim());
        console.log(`[FILE CMD] listFiles lines:`, lines);
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
        console.log(`[FILE CMD] listFiles parsed files:`, files);
        return files;
      }
      
      console.log(`[FILE CMD] listFiles returning empty array - result was not string`);
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
      // Usa exec() para permitir múltiplas declarações em uma linha
      const command = `exec("with open('${filePath}', 'r') as f:\\n    content = f.read()\\nprint(repr(content))")`;
      
      const result = await executeCommand(command, 8000);
      
      if (typeof result === 'string' && result.startsWith('ERROR:')) {
        throw new Error(result);
      }
      
      // Processa resultado do repr() - remove aspas e decodifica escapes
      if (typeof result === 'string') {
        let content = result;
        
        // Remove aspas simples ou duplas do início e fim
        if ((content.startsWith("'") && content.endsWith("'")) ||
            (content.startsWith('"') && content.endsWith('"'))) {
          content = content.slice(1, -1);
        }
        
        // Decodifica escapes do repr()
        content = content
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');
        
        return content;
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
      
      // Para arquivos muito grandes, usa timeout maior
      const timeout = content.length > 2000 ? 20000 : 8000;
      
      const command = `exec("with open('${filePath}', 'w') as f:\\n    f.write('${escapedContent}')\\nprint('SUCCESS')")`;
      
      const result = await executeCommand(command, timeout);
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
    deleteDirectory,
    clearQueue,
  };
};