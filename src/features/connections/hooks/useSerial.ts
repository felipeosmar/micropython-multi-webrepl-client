import { useState, useCallback, useRef, useEffect } from 'react';
import { ReplStatus } from '../types';
import { useSimpleFileCommands } from '../../file-manager/hooks';
import { SYSTEM_MESSAGES } from '../../../shared/constants/system.messages';

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
  const reader = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writer = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
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
    
    setLines(prev => [...prev, processedData]);
  }, [showTimestamp]);

  /**
   * Envia dados brutos para a porta serial
   * @param data - String a ser enviada
   */
  const sendData = useCallback(async (data: string) => {
    if (writer.current && status === ReplStatus.CONNECTED) {
      const encoder = new TextEncoder();
      await writer.current.write(encoder.encode(data));
    }
  }, [status]);

  /**
   * Envia um comando para o MicroPython REPL
   * Adiciona o terminador de linha apropriado conforme configuração
   * @param command - Comando a ser executado
   */
  const sendCommand = useCallback((command: string) => {
    let line = command;
    if (lineEnding === 'carriageReturn') {
      line += '\r';
    } else if (lineEnding === 'newline') {
      line += '\n';
    } else if (lineEnding === 'both') {
      line += '\r\n';
    }
    sendData(line);
  }, [sendData, lineEnding]);

  const fileCommands = useSimpleFileCommands(sendCommand);

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
      appendLine(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.DISCONNECTED}`);
      // Limpa fila de comandos quando desconecta
      if (fileCommands.clearQueue) {
        fileCommands.clearQueue();
      }
    }
  }, [appendLine, status, fileCommands]);

  /**
   * Inicia o loop de leitura contínua da porta serial
   * Executa de forma assíncrona e processa dados recebidos
   */
  const startReadingLoop = useCallback(async () => {
    if (!reader.current || !keepReading.current) return;
    const decoder = new TextDecoder();

    try {
      while (keepReading.current && reader.current) {
        const { value, done } = await reader.current.read();
        if (done) {
          break;
        }
        if (value) {
          const text = decoder.decode(value, { stream: true });
          appendLine(text);
        }
      }
    } catch (error: any) {
      if (keepReading.current) {
        appendLine(`[SYSTEM] Read error: ${error.message}`);
      }
    } finally {
      if (keepReading.current) {
        setStatus(ReplStatus.DISCONNECTED);
        appendLine(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.DISCONNECTED}`);
        // Limpa fila de comandos quando há erro de leitura
        if (fileCommands.clearQueue) {
          fileCommands.clearQueue();
        }
      }
    }
  }, [appendLine, fileCommands]);

  /**
   * Estabelece conexão com a porta serial
   * - Valida disponibilidade da porta
   * - Configura parâmetros de comunicação
   * - Inicializa streams de leitura e escrita
   * - Inicia loop de leitura
   */
  const connect = useCallback(async () => {
    if (!portRef.current) {
      appendLine(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.SERIAL_PORT_NOT_SELECTED}`);
      setStatus(ReplStatus.ERROR);
      return;
    }
    if (status === ReplStatus.CONNECTED || status === ReplStatus.CONNECTING || connecting.current) {
      return;
    }

    try {
      connecting.current = true;
      setStatus(ReplStatus.CONNECTING);
      appendLine(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.CONNECTING}`);

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
        throw new Error(SYSTEM_MESSAGES.CONNECTION.SERIAL_PORT_NOT_AVAILABLE);
      }

      await portRef.current.open({ 
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });
      appendLine(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.CONNECTED}`);

      if (!portRef.current.writable) {
        throw new Error("Writable stream not available");
      }
      writer.current = portRef.current.writable.getWriter();

      if (!portRef.current.readable) {
        throw new Error("Readable stream not available");
      }
      // Obter o leitor diretamente, que fornecerá Uint8Array
      reader.current = portRef.current.readable.getReader();

      connecting.current = false;
      setStatus(ReplStatus.CONNECTED);
      appendLine(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.REPL_READY}`);
      keepReading.current = true;

      // Start the reading loop separately
      readingLoop.current = startReadingLoop();

    } catch (error: any) {
      connecting.current = false;
      appendLine(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.CONNECTION_FAILED}: ${error.message}`);
      setStatus(ReplStatus.ERROR);
      // Limpa fila de comandos quando há erro de conexão
      if (fileCommands.clearQueue) {
        fileCommands.clearQueue();
      }
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
  }, [appendLine, status, startReadingLoop, baudRate, fileCommands]);

  const checkPortAvailability = useCallback(async () => {
    if (!portRef.current) return false;
    
    try {
      // Check if port is still available in the system
      const ports = await navigator.serial.getPorts();
      return ports.includes(portRef.current);
    } catch (error) {
      return false;
    }
  }, []);

  const clearOutput = useCallback(() => {
    setLines([]);
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
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    lines,
    autoScroll,
    connect,
    disconnect,
    sendCommand,
    sendDirectCommand: sendCommand, // Alias para compatibilidade
    clearOutput,
    checkPortAvailability,
    ...fileCommands,
  };
};
