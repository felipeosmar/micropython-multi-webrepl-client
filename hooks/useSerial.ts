import { useState, useCallback, useRef, useEffect } from 'react';
import { ReplStatus } from '../types';

// Adicionando a definição da interface SerialPort para clareza
interface SerialPort extends EventTarget {
  // Adicione aqui as propriedades e métodos que você usa da SerialPort API
  // Exemplo:
  open(options: any): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  // Adicione outros métodos e propriedades conforme necessário
}


export const useSerial = (port: SerialPort | null | undefined) => {
  const [status, setStatus] = useState<ReplStatus>(ReplStatus.DISCONNECTED);
  const [lines, setLines] = useState<string[]>([]);
  const reader = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const writer = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const keepReading = useRef(true);
  const portRef = useRef(port);

  const appendLine = useCallback((data: string) => {
    const sanitizedData = data.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    setLines(prev => [...prev, sanitizedData]);
  }, []);

  const disconnect = useCallback(async () => {
    keepReading.current = false;
    if (reader.current) {
      try {
        await reader.current.cancel();
      } catch (e) {}
    }
    if (writer.current) {
      try {
        await writer.current.close();
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
    if (status === ReplStatus.CONNECTED) {
      return;
    }

    try {
      setStatus(ReplStatus.CONNECTING);
      appendLine('[SYSTEM] Opening serial port...');

      await portRef.current.open({ baudRate: 115200 });
      appendLine(`[SYSTEM] Opened serial port.`);

      writer.current = portRef.current.writable!.getWriter();

      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = portRef.current.readable!.pipeTo(textDecoder.writable as any);
      reader.current = textDecoder.readable.getReader();

      setStatus(ReplStatus.CONNECTED);
      appendLine('[SYSTEM] Connected. Press Enter to get a prompt.');
      keepReading.current = true;

      while (portRef.current?.readable && keepReading.current) {
        try {
            const { value, done } = await reader.current!.read();
            if (done) {
              break;
            }
            appendLine(value);
        } catch (error: any) {
            if (!keepReading.current) break;
            appendLine(`[SYSTEM] Read error: ${error.message}`);
            break;
        }
      }
      
      await readableStreamClosed.catch(() => {}); // Wait for the pipe to close

       if (status !== ReplStatus.ERROR) {
          setStatus(ReplStatus.DISCONNECTED);
          appendLine('[SYSTEM] Disconnected from serial port.');
      }

    } catch (error: any) {
      appendLine(`[SYSTEM] Connection Error: ${error.message}`);
      setStatus(ReplStatus.ERROR);
    }
  }, [appendLine, status]);

  useEffect(() => {
    if (portRef.current && status === ReplStatus.DISCONNECTED) {
      connect();
    }
  }, [connect, status]);

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
    sendData(command + '\r\n');
  }, [sendData]);

  return { status, lines, sendCommand, connect, disconnect };
};
