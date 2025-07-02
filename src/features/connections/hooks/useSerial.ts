import { useState, useCallback, useRef, useEffect } from 'react';
import { ReplStatus } from '../types';
import { useSimpleFileCommands } from '../../file-manager/hooks';

// Removido: interface duplicada - usando tipos globais do Web Serial API

/**
 * Hook customizado para gerenciar conexões seriais com MicroPython
 * 
 * Funcionalidades principais:
 * - Conexão automática ao receber nova porta
 * - Gerenciamento do ciclo de vida da conexão
 * - Stream de dados bidirecional
 * - Suporte a diferentes terminadores de linha
 * - Opções de display (timestamp, autoscroll)
 * 
 * @param port - Porta serial do dispositivo
 * @param baudRate - Taxa de transmissão (padrão: 115200)
 * @param lineEnding - Tipo de terminador para comandos (padrão: carriage return)
 * @param autoScroll - Se deve rolar terminal automaticamente
 * @param showTimestamp - Se deve mostrar timestamp nas mensagens
 */
export const useSerial = (
  port: SerialPort | null | undefined, 
  baudRate: number = 115200,
  lineEnding: 'none' | 'newline' | 'carriageReturn' | 'both' = 'carriageReturn',
  autoScroll: boolean = true,
  showTimestamp: boolean = false
) => {
  const [status, setStatus] = useState<ReplStatus>(ReplStatus.DISCONNECTED);
  const [lines, setLines] = useState<string[]>([]);
  const reader = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const writer = useRef<WritableStreamDefaultWriter<BufferSource> | null>(null);
  const keepReading = useRef(true);
  const portRef = useRef(port);
  const connecting = useRef(false);
  const readingLoop = useRef<Promise<void> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  /**
   * Adiciona uma nova linha ao terminal com sanitição e processamento
   * - Remove caracteres de controle desnecessários
   * - Adiciona timestamp se habilitado
   * - Gerencia quebras de linha adequadamente
   */
  const appendLine = useCallback((data: string) => {
    // Sanitização para MicroPython REPL: remove caracteres de controle e sequências ANSI
    const sanitizedData = data.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\x1B\[[0-9;]*m/g, '');
    
    let processedData = sanitizedData;
    if (showTimestamp && sanitizedData.trim().length > 0) {
      const timestamp = new Date().toLocaleTimeString();
      processedData = `[${timestamp}] ${sanitizedData}`;
    }
    
    setLines(prev => {
      if (prev.length === 0) {
        return [processedData];
      }
      const lastLine = prev[prev.length - 1];
      // Handle newlines properly
      if (processedData.includes('\n')) {
        const parts = processedData.split('\n');
        const firstPart = parts.shift() || '';
        const newLastLine = lastLine + firstPart;
        return [...prev.slice(0, -1), newLastLine, ...parts];
      } else {
        // Append to last line
        const newLastLine = lastLine + processedData;
        return [...prev.slice(0, -1), newLastLine];
      }
    });
  }, [showTimestamp]);

  /**
   * Desconecta da porta serial e limpa todos os recursos
   * - Para o loop de leitura
   * - Fecha streams de leitura e escrita
   * - Fecha a porta serial
   * - Atualiza o status da conexão
   */
  const disconnect = useCallback(async () => {
    keepReading.current = false;
    connecting.current = false;
    
    // Cancel any ongoing operations
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    
    // Wait for reading loop to finish with timeout
    if (readingLoop.current) {
      try {
        await Promise.race([
          readingLoop.current,
          new Promise(resolve => setTimeout(resolve, 1000))
        ]);
      } catch (e) {}
      readingLoop.current = null;
    }
    
    // Cleanup streams
    const cleanupPromises: Promise<void>[] = [];
    
    if (reader.current) {
      cleanupPromises.push(
        reader.current.cancel().catch(() => {}).then(() => {
          reader.current = null;
        })
      );
    }
    
    if (writer.current) {
      cleanupPromises.push(
        writer.current.close().catch(() => {}).then(() => {
          writer.current = null;
        })
      );
    }
    
    // Wait for cleanup with timeout
    try {
      await Promise.race([
        Promise.all(cleanupPromises),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
    } catch (e) {}
    
    // Close port
    if (portRef.current) {
      try {
        if (portRef.current.readable || portRef.current.writable) {
          await Promise.race([
            portRef.current.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
          ]);
        }
      } catch (e) {
        // Port might already be closed, ignore errors
      }
    }
    
    // Only update status if not already disconnected and not in a silent disconnect
    if (status !== ReplStatus.DISCONNECTED && !connecting.current) {
      setStatus(ReplStatus.DISCONNECTED);
      appendLine('[SYSTEM] Disconnected.');
    }
  }, [appendLine, status]);

  /**
   * Inicia o loop de leitura contínua da porta serial
   * Executa de forma assíncrona e processa dados recebidos
   */
  const startReadingLoop = useCallback(async () => {
    if (!reader.current || !keepReading.current) return;
    
    try {
      while (keepReading.current && reader.current) {
        const { value, done } = await reader.current.read();
        if (done) {
          break;
        }
        // Better data filtering to prevent corruption
        if (value && typeof value === 'string') {
          appendLine(value);
        }
      }
    } catch (error: any) {
      if (keepReading.current) {
        appendLine(`[SYSTEM] Read error: ${error.message}`);
      }
    } finally {
      if (keepReading.current) {
        setStatus(ReplStatus.DISCONNECTED);
        appendLine('[SYSTEM] Disconnected from serial port.');
      }
    }
  }, [appendLine]);

  /**
   * Estabelece conexão com a porta serial
   * - Valida disponibilidade da porta
   * - Configura parâmetros de comunicação
   * - Inicializa streams de leitura e escrita
   * - Inicia loop de leitura
   */
  const connect = useCallback(async () => {
    if (!portRef.current) {
      appendLine('[SYSTEM] Error: No serial port provided.');
      setStatus(ReplStatus.ERROR);
      return;
    }
    if (status === ReplStatus.CONNECTED || status === ReplStatus.CONNECTING || connecting.current) {
      return;
    }

    try {
      connecting.current = true;
      setStatus(ReplStatus.CONNECTING);
      appendLine('[SYSTEM] Opening serial port...');

      // Create new AbortController for this connection attempt
      abortController.current = new AbortController();
      
      // Ensure clean state before connecting
      keepReading.current = false;
      
      // Clean up existing connections without logging
      if (reader.current) {
        try {
          await reader.current.cancel();
        } catch (e) {}
        reader.current = null;
      }
      
      if (writer.current) {
        try {
          await writer.current.close();
        } catch (e) {}
        writer.current = null;
      }
      
      // Close port if it's open
      if (portRef.current.readable || portRef.current.writable) {
        try {
          await portRef.current.close();
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          // Port might already be closed
        }
      }
      
      // Check if port is still available
      const ports = await navigator.serial.getPorts();
      if (!ports.includes(portRef.current)) {
        throw new Error('Serial port is no longer available');
      }

      await portRef.current.open({ 
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });
      appendLine(`[SYSTEM] Opened serial port at ${baudRate} baud.`);

      writer.current = portRef.current.writable!.getWriter();

      const textDecoder = new TextDecoderStream('utf-8', { fatal: false, ignoreBOM: true });
      const readable = portRef.current.readable!;
      readable.pipeTo(textDecoder.writable).catch(() => {});
      reader.current = textDecoder.readable.getReader();

      connecting.current = false;
      setStatus(ReplStatus.CONNECTED);
      appendLine('[SYSTEM] Connected. Press Enter to get a prompt.');
      keepReading.current = true;

      // Start the reading loop separately
      readingLoop.current = startReadingLoop();

    } catch (error: any) {
      connecting.current = false;
      appendLine(`[SYSTEM] Connection Error: ${error.message}`);
      setStatus(ReplStatus.ERROR);
      // Clean up resources on error
      if (reader.current) {
        try {
          await reader.current.cancel();
          reader.current = null;
        } catch (e) {}
      }
      if (writer.current) {
        try {
          await writer.current.close();
          writer.current = null;
        } catch (e) {}
      }
    }
  }, [appendLine, status, startReadingLoop, disconnect]);

  const checkPortAvailability = useCallback(async () => {
    if (!portRef.current) return false;
    
    try {
      // Check if port is still available in the system
      const ports = await navigator.serial.getPorts();
      return ports.includes(portRef.current);
    } catch {
      return false;
    }
  }, []);

  // Update port reference when prop changes and auto-connect
  useEffect(() => {
    const prevPort = portRef.current;
    portRef.current = port;
    
    // Auto-connect when a new port is provided
    if (port && (status === ReplStatus.DISCONNECTED || status === ReplStatus.ERROR)) {
      // Check if this is a new port by comparing info
      const shouldConnect = !prevPort || (
        prevPort.getInfo().usbVendorId !== port.getInfo().usbVendorId ||
        prevPort.getInfo().usbProductId !== port.getInfo().usbProductId
      );
      
      if (shouldConnect) {
        // Immediate connection attempt for new ports
        const attemptConnection = async () => {
          // Wait a bit to ensure component is ready
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Double-check the port is still the same and status allows connection
          if (portRef.current === port && 
              (status === ReplStatus.DISCONNECTED || status === ReplStatus.ERROR) &&
              !connecting.current) {
            // Auto-connecting to new serial port
            connect();
          }
        };
        
        attemptConnection();
      }
    }
  }, [port, status, connect]);

  // Separate effect for initial port setup to ensure auto-connection
  useEffect(() => {
    if (port && status === ReplStatus.DISCONNECTED && !connecting.current) {
      // Initial port detected, attempting auto-connection
      // Very short delay to ensure everything is initialized
      const timer = setTimeout(() => {
        if (port && portRef.current === port && status === ReplStatus.DISCONNECTED && !connecting.current) {
          connect();
        }
      }, 10);
      
      return () => clearTimeout(timer);
    }
  }, [port]); // Only depend on port to trigger on initial setup

  useEffect(() => {
    return () => {
      keepReading.current = false;
      if (readingLoop.current) {
        readingLoop.current.catch(() => {});
      }
      disconnect();
    };
  }, []);


  /**
   * Envia dados brutos para a porta serial
   * @param data - String a ser enviada
   */
  const sendData = useCallback(async (data: string) => {
    if (writer.current) {
        const encoder = new TextEncoder();
        await writer.current.write(encoder.encode(data));
    } else {
      appendLine('[SYSTEM] Cannot send data, not connected.');
    }
  }, [appendLine]);

  /**
   * Envia um comando para o MicroPython REPL
   * Adiciona o terminador de linha apropriado conforme configuração
   * @param command - Comando a ser executado
   */
  const sendCommand = useCallback((command: string) => {
    if (command.trim() === '') {
      // Envia carriage return para obter novo prompt
      sendData('\r');
      return;
    }
    
    // Seleciona o terminador de linha baseado na configuração
    let ending = '';
    switch (lineEnding) {
      case 'newline':
        ending = '\n';
        break;
      case 'carriageReturn':
        ending = '\r';  // Padrão para MicroPython
        break;
      case 'both':
        ending = '\r\n';
        break;
      case 'none':
      default:
        ending = '';
        break;
    }
    
    sendData(command + ending);
  }, [sendData, lineEnding]);

  /**
   * Limpa todo o conteúdo do terminal
   */
  const clearOutput = useCallback(() => {
    setLines([]);
  }, []);

  // Integração com comandos de arquivo
  const fileCommands = useSimpleFileCommands(sendCommand);

  // Processar mensagens para comandos de arquivo também
  useEffect(() => {
    if (lines.length > 0) {
      // Processa toda a mensagem concatenada, não apenas a última linha
      const allMessages = lines.join('\n');
      fileCommands.processMessage(allMessages);
    }
  }, [lines, fileCommands]);
  
  return { status, lines, sendCommand, connect, disconnect, checkPortAvailability, clearOutput, autoScroll, fileCommands };
};
