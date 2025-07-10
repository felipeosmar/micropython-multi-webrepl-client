import { useCallback, useRef, useState } from 'react';

/**
 * Hook alternativo para comandos de arquivo que lê diretamente das linhas do terminal
 * Esta é uma abordagem mais direta que processa a saída visível
 */
export const useTerminalFileCommands = (
  sendCommand: (command: string) => void,
  lines: string[],
  isConnected?: boolean
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const pendingCommandRef = useRef<{
    commandId: string;
    type: 'listFiles' | 'readFile' | 'writeFile';
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    startLine: number;
  } | null>(null);

  /**
   * Processa as linhas do terminal para extrair resultados
   */
  const processTerminalLines = useCallback(() => {
    if (!pendingCommandRef.current) return;

    const { commandId, type, resolve, startLine } = pendingCommandRef.current;
    const startMarker = `__START_${commandId}__`;
    const endMarker = `__END_${commandId}__`;

    // Procura pelos marcadores nas linhas
    let startFound = false;
    let endFound = false;
    let startIndex = -1;
    let endIndex = -1;

    for (let i = startLine; i < lines.length; i++) {
      if (lines[i].includes(startMarker)) {
        startFound = true;
        startIndex = i;
      }
      if (lines[i].includes(endMarker)) {
        endFound = true;
        endIndex = i;
        break;
      }
    }

    if (startFound && endFound && startIndex < endIndex) {
      // Extrai o conteúdo entre os marcadores
      const resultLines = lines.slice(startIndex + 1, endIndex);
      const result = resultLines.join('\n').trim();

      console.log(`[TERMINAL FILE CMD] Command ${commandId} completed`);
      console.log(`[TERMINAL FILE CMD] Result lines:`, resultLines);

      // Processa baseado no tipo de comando
      if (type === 'listFiles') {
        const files = resultLines
          .filter(line => line.trim() && !line.includes('>>>'))
          .map(line => {
            const parts = line.trim().split(' ');
            if (parts.length >= 3) {
              return {
                name: parts[0],
                type: parseInt(parts[1]) === 0x4000 ? 'dir' : 'file',
                size: parseInt(parts[2]) || 0
              };
            }
            return null;
          })
          .filter(Boolean);

        console.log(`[TERMINAL FILE CMD] Parsed files:`, files);
        resolve(files);
      } else {
        resolve(result);
      }

      pendingCommandRef.current = null;
      setIsProcessing(false);
    }
  }, [lines]);

  /**
   * Lista arquivos usando abordagem baseada em terminal
   */
  const listFiles = useCallback(async (path: string = '/'): Promise<any[]> => {
    if (!isConnected) {
      throw new Error('Not connected');
    }

    return new Promise((resolve, reject) => {
      const commandId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const currentLineCount = lines.length;

      pendingCommandRef.current = {
        commandId,
        type: 'listFiles',
        resolve,
        reject,
        startLine: currentLineCount
      };

      setIsProcessing(true);

      // Envia comando com marcadores
      const command = `print("__START_${commandId}__"); exec("import os\\nfor f in os.ilistdir('${path}'):\\n    print(f[0], f[1], f[3])"); print("__END_${commandId}__")`;
      
      console.log(`[TERMINAL FILE CMD] Sending command: ${command}`);
      sendCommand(command);

      // Timeout de segurança
      setTimeout(() => {
        if (pendingCommandRef.current?.commandId === commandId) {
          console.log(`[TERMINAL FILE CMD] Command ${commandId} timed out`);
          pendingCommandRef.current = null;
          setIsProcessing(false);
          reject(new Error('Command timeout'));
        }
      }, 10000);
    });
  }, [sendCommand, lines, isConnected]);

  // Monitora mudanças nas linhas para processar comandos pendentes
  useCallback(() => {
    if (pendingCommandRef.current && lines.length > pendingCommandRef.current.startLine) {
      processTerminalLines();
    }
  }, [lines, processTerminalLines]);

  return {
    listFiles,
    isProcessing,
    // Adicione outros métodos conforme necessário
  };
};