import { useState, useCallback, useRef, useEffect } from 'react';
import { ReplStatus } from '../types';

// Adicionando a definição da interface SerialPort para clareza
interface SerialPort extends EventTarget {
  open(options: any): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<BufferSource> | null;
  onconnect: ((this: SerialPort, ev: Event) => any) | null;
  ondisconnect: ((this: SerialPort, ev: Event) => any) | null;
  connected: boolean;
  setSignals(signals: any): Promise<void>;
  getSignals(): Promise<any>;
  getInfo(): any;
}


export const useSerial = (
  port: SerialPort | null | undefined, 
  baudRate: number = 115200,
  lineEnding: 'none' | 'newline' | 'carriageReturn' | 'both' = 'none',
  autoScroll: boolean = true,
  showTimestamp: boolean = false
) => {
  const [status, setStatus] = useState<ReplStatus>(ReplStatus.DISCONNECTED);
  const [lines, setLines] = useState<string[]>([]);
  const [clearLines, setClearLines] = useState(() => () => {});
  const reader = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const writer = useRef<WritableStreamDefaultWriter<BufferSource> | null>(null);
  const keepReading = useRef(true);
  const portRef = useRef(port);
  const connecting = useRef(false);

  const appendLine = useCallback((data: string) => {
    // Improved sanitization for MicroPython REPL
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

  const disconnect = useCallback(async () => {
    keepReading.current = false;
    connecting.current = false;
    
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
    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (e) {}
    }
    if (status !== ReplStatus.DISCONNECTED) {
      setStatus(ReplStatus.DISCONNECTED);
      appendLine('[SYSTEM] Disconnected.');
    }
  }, [appendLine, status]);

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

      // Check if port is already open
      if (portRef.current.readable || portRef.current.writable) {
        appendLine('[SYSTEM] Port is already open, closing first...');
        await portRef.current.close();
        // Wait a bit for the port to fully close
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await portRef.current.open({ 
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });
      appendLine(`[SYSTEM] Opened serial port.`);

      writer.current = portRef.current.writable!.getWriter();

      const textDecoder = new TextDecoderStream('utf-8', { fatal: false, ignoreBOM: true });
      const readable = portRef.current.readable!;
      const readableStreamClosed = readable.pipeTo(textDecoder.writable).catch(() => {});
      reader.current = textDecoder.readable.getReader();

      connecting.current = false;
      setStatus(ReplStatus.CONNECTED);
      appendLine('[SYSTEM] Connected. Press Enter to get a prompt.');
      keepReading.current = true;

      while (portRef.current?.readable && keepReading.current && reader.current) {
        try {
            const { value, done } = await reader.current.read();
            if (done) {
              break;
            }
            // Better data filtering to prevent corruption
            if (value && typeof value === 'string' && value.trim().length > 0) {
              appendLine(value);
            }
        } catch (error: any) {
            if (!keepReading.current) break;
            appendLine(`[SYSTEM] Read error: ${error.message}`);
            break;
        }
      }
      
      await readableStreamClosed.catch(() => {}); // Wait for the pipe to close

      if (keepReading.current) {
          setStatus(ReplStatus.DISCONNECTED);
          appendLine('[SYSTEM] Disconnected from serial port.');
      }

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
  }, [appendLine, status]);

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

  // Update port reference when prop changes
  useEffect(() => {
    portRef.current = port;
  }, [port]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);


  const sendData = useCallback(async (data: string) => {
    if (writer.current) {
        const encoder = new TextEncoder();
        await writer.current.write(encoder.encode(data));
    } else {
      appendLine('[SYSTEM] Cannot send data, not connected.');
    }
  }, [appendLine]);

  const sendCommand = useCallback((command: string) => {
    if (command.trim() === '') {
      // Send carriage return for new prompt
      sendData('\r');
      return;
    }
    
    let ending = '';
    switch (lineEnding) {
      case 'newline':
        ending = '\n';
        break;
      case 'carriageReturn':
        ending = '\r';
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

  const clearOutput = useCallback(() => {
    setLines([]);
  }, []);
  
  return { status, lines, sendCommand, connect, disconnect, checkPortAvailability, clearOutput, autoScroll };
};
