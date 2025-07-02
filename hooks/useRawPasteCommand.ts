import { useCallback, useRef } from 'react';

/**
 * Hook para comandos MicroPython usando raw-paste mode
 * Baseado na documentação oficial: https://docs.micropython.org/en/latest/reference/repl.html
 * 
 * Raw-paste mode é o método recomendado para automação REPL
 */
export const useRawPasteCommand = (
  sendData: (data: string) => void
) => {
  const commandQueue = useRef<{
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    expectedEnd: string;
    buffer: string;
  }[]>([]);

  /**
   * Processa mensagens recebidas do WebREPL
   */
  const processMessage = useCallback((message: string) => {
    if (commandQueue.current.length === 0) return;

    const currentCommand = commandQueue.current[0];
    currentCommand.buffer += message;

    // Verifica se recebeu a resposta completa
    if (currentCommand.buffer.includes(currentCommand.expectedEnd)) {
      const command = commandQueue.current.shift();
      if (command) {
        clearTimeout(command.timeout);
        
        // Extrai resultado entre os marcadores
        const startMarker = 'RAW_PASTE_RESULT_START';
        const endMarker = 'RAW_PASTE_RESULT_END';
        
        const startIndex = command.buffer.indexOf(startMarker);
        const endIndex = command.buffer.indexOf(endMarker);
        
        if (startIndex !== -1 && endIndex !== -1) {
          const result = command.buffer
            .substring(startIndex + startMarker.length, endIndex)
            .trim();
          
          try {
            // Tenta parsear como JSON se parecer ser uma lista/objeto
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
          } catch (error) {
            command.resolve(result);
          }
        } else {
          command.reject(new Error('Invalid response format'));
        }
      }
    }
  }, []);

  /**
   * Executa comando usando raw-paste mode
   */
  const executeCommand = useCallback(async (
    command: string,
    timeoutMs: number = 5000
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const expectedEnd = 'RAW_PASTE_RESULT_END';
      
      const timeout = setTimeout(() => {
        // Remove da queue se timeout
        const index = commandQueue.current.findIndex(cmd => cmd.resolve === resolve);
        if (index !== -1) {
          commandQueue.current.splice(index, 1);
        }
        reject(new Error(`Command timeout: ${command.substring(0, 50)}...`));
      }, timeoutMs);

      commandQueue.current.push({
        resolve,
        reject,
        timeout,
        expectedEnd,
        buffer: ''
      });

      // Envolve comando com marcadores para identificar resultado
      const wrappedCommand = `
try:
    print("RAW_PASTE_RESULT_START")
    ${command}
    print("RAW_PASTE_RESULT_END")
except Exception as e:
    print("RAW_PASTE_RESULT_START")
    print("ERROR:", str(e))
    print("RAW_PASTE_RESULT_END")
`;

      // Entra em raw-paste mode
      sendData('\x05'); // Ctrl+E para raw-paste mode
      
      // Aguarda um pouco e envia o comando
      setTimeout(() => {
        sendData(wrappedCommand);
        sendData('\x04'); // Ctrl+D para executar
      }, 100);
    });
  }, [sendData]);

  /**
   * Lista arquivos usando comando MicroPython simples
   */
  const listFiles = useCallback(async (path: string = '/'): Promise<any[]> => {
    try {
      const command = `
import uos
result = []
try:
    for item in uos.ilistdir('${path}'):
        item_type = 'directory' if item[1] == 0x4000 else 'file'
        result.append({
            'name': item[0],
            'type': item_type,
            'size': item[3] if item_type == 'file' else None
        })
    print(result)
except:
    print([])
`;
      
      const result = await executeCommand(command, 3000);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('ListFiles error:', error);
      return [];
    }
  }, [executeCommand]);

  /**
   * Lê conteúdo de um arquivo
   */
  const readFile = useCallback(async (filePath: string): Promise<string> => {
    try {
      const command = `
try:
    with open('${filePath}', 'r') as f:
        content = f.read()
    print(repr(content))
except Exception as e:
    print("ERROR:", str(e))
`;
      
      const result = await executeCommand(command, 5000);
      
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
      const escapedContent = content.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const command = `
try:
    with open('${filePath}', 'w') as f:
        f.write('${escapedContent}')
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
`;
      
      const result = await executeCommand(command, 5000);
      return result;
    } catch (error) {
      return `ERROR: ${error}`;
    }
  }, [executeCommand]);

  /**
   * Cria um diretório
   */
  const createDirectory = useCallback(async (dirPath: string): Promise<string> => {
    try {
      const command = `
try:
    import uos
    uos.mkdir('${dirPath}')
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
`;
      
      const result = await executeCommand(command, 3000);
      return result;
    } catch (error) {
      return `ERROR: ${error}`;
    }
  }, [executeCommand]);

  /**
   * Deleta um arquivo
   */
  const deleteFile = useCallback(async (filePath: string): Promise<string> => {
    try {
      const command = `
try:
    import uos
    uos.remove('${filePath}')
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
`;
      
      const result = await executeCommand(command, 3000);
      return result;
    } catch (error) {
      return `ERROR: ${error}`;
    }
  }, [executeCommand]);

  /**
   * Deleta um diretório
   */
  const deleteDirectory = useCallback(async (dirPath: string): Promise<string> => {
    try {
      const command = `
try:
    import uos
    uos.rmdir('${dirPath}')
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
`;
      
      const result = await executeCommand(command, 3000);
      return result;
    } catch (error) {
      return `ERROR: ${error}`;
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