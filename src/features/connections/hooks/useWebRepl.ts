import { useState, useEffect, useRef, useCallback } from 'react';
import { ReplStatus } from '../types';
import { useSimpleFileCommands } from '../../file-manager/hooks';

/**
 * Hook customizado para gerenciar conexões WebREPL com MicroPython
 * 
 * Funcionalidades principais:
 * - Conexão WebSocket com dispositivos MicroPython
 * - Autenticação automática com senha salva
 * - Reconexão manual
 * - Sanitização de dados recebidos
 * - Gerenciamento de estado da conexão
 * 
 * @param url - URL WebSocket do dispositivo (ex: "ws://192.168.4.1:8266")
 * @param password - Senha para autenticação automática
 */
export const useWebRepl = (url: string | null, password?: string) => {
  const [status, setStatus] = useState<ReplStatus>(ReplStatus.DISCONNECTED);
  const [lines, setLines] = useState<string[]>([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const ws = useRef<WebSocket | null>(null);
  const passwordSent = useRef(false);
  const effectId = useRef(0); // Add a ref to track effect instances
  const retryCount = useRef(0);
  const maxRetries = 3;
  const retryDelay = useRef(1000); // Start with 1 second


  /**
   * Adiciona uma nova linha ao terminal com sanitição
   * Remove caracteres de controle mas preserva espaços em branco básicos
   */
  const appendLine = useCallback((data: string) => {
    // Sanitiza caracteres de controle para exibição limpa
    const sanitizedData = data.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    setLines(prev => {
      if (prev.length === 0) {
        return [sanitizedData];
      }
      const lastLine = prev[prev.length - 1];
      // If the incoming data contains newlines, we split and add new lines
      if (sanitizedData.includes('\n')) {
        const parts = sanitizedData.split('\n');
        const firstPart = parts.shift() || '';
        const newLastLine = lastLine + firstPart;
        return [...prev.slice(0, -1), newLastLine, ...parts];
      } else {
        // Otherwise, we append to the last line
        const newLastLine = lastLine + sanitizedData;
        return [...prev.slice(0, -1), newLastLine];
      }
    });
  }, []);

  /**
   * Envia dados brutos através do WebSocket
   * @param data - String a ser enviada
   */
  const sendData = useCallback((data: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(data);
    } else {
      appendLine('[SYSTEM] Cannot send data, not connected.');
    }
  }, [appendLine]);

  /**
   * Envia um comando para o WebREPL
   * Implementa estratégia de reset + comando para garantir execução
   * @param command - Comando a ser executado
   */
  const sendCommand = useCallback((command: string) => {
    if (command.trim() === '') {
      // Se usuário apenas pressiona enter, envia carriage return para novo prompt
      sendData('\r');
      return;
    }
    
    // Limpa qualquer caractere de controle invisível do comando
    const cleanCommand = command.replace(/[\r\n\t\x00-\x1F\x7F]/g, '');
    
    // Estratégia de reset + comando para garantir que saia do modo de continuação
    // 1. Envia Ctrl+C para garantir que sai de qualquer estado de continuação
    sendData('\x03');
    
    // 2. Pequeno delay e depois envia o comando
    setTimeout(() => {
      sendData(cleanCommand + '\r');
    }, 50); // Reduzido para 50ms para ser mais responsivo
  }, [sendData]);

  /**
   * Força uma tentativa de reconexão
   * Incrementa o contador de tentativas para triggerar o useEffect
   */
  const reconnect = useCallback(() => {
    retryCount.current = 0; // Reset retry count on manual reconnect
    retryDelay.current = 1000; // Reset delay
    setReconnectAttempt(c => c + 1);
  }, []);

  /**
   * Tentativa automática de reconexão com exponential backoff
   */
  const scheduleRetry = useCallback(() => {
    if (retryCount.current < maxRetries) {
      retryCount.current += 1;
      appendLine(`[SYSTEM] Retry attempt ${retryCount.current}/${maxRetries} in ${retryDelay.current/1000}s...`);
      
      setTimeout(() => {
        setReconnectAttempt(c => c + 1);
      }, retryDelay.current);
      
      // Exponential backoff: double the delay for next retry
      retryDelay.current = Math.min(retryDelay.current * 2, 10000); // Max 10 seconds
    } else {
      appendLine('[SYSTEM] Max retry attempts reached. Use reconnect button to try again.');
      retryCount.current = 0;
      retryDelay.current = 1000;
    }
  }, [appendLine]);


  useEffect(() => {
    if (status === ReplStatus.PASSWORD && password && !passwordSent.current) {
      appendLine('[SYSTEM] Saved password found. Attempting auto-login...');
      sendData(password + '\r');
      passwordSent.current = true;
    }
  }, [status, password, sendData, appendLine]);


  useEffect(() => {
    if (!url) {
      setStatus(ReplStatus.DISCONNECTED);
      setLines([]);
      return;
    }

    // Increment the effect ID on each run. This helps ignore events from stale effects.
    effectId.current += 1;
    const currentEffectId = effectId.current;

    setLines([]);
    passwordSent.current = false; // Reset on new connection
    appendLine(`[SYSTEM] Connecting to ${url}...`);
    setStatus(ReplStatus.CONNECTING);
    
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (error) {
        console.error("WebSocket connection error:", error);
        let errorMessage = '[SYSTEM] Error: Invalid WebSocket URL.';
        // This handles the mixed-content security error
        if (error instanceof DOMException && error.name === 'SecurityError') {
             errorMessage = '[SYSTEM] Error: Connection blocked. Cannot connect to insecure ws:// from a secure https:// page. Use a wss:// URL if available.';
        }
        appendLine(errorMessage);
        setStatus(ReplStatus.ERROR);
        return;
    }

    ws.current = socket;

    const onOpen = () => {
      if (effectId.current !== currentEffectId) return; // Stale effect
      appendLine('[SYSTEM] Connection opened. Waiting for prompt...');
    };

    const onMessage = (event: MessageEvent) => {
      if (effectId.current !== currentEffectId) return; // Stale effect
      const data = event.data as string;
      
      // Simplesmente mostra todas as mensagens no terminal
      appendLine(data);
       setStatus(prevStatus => {
        if (data.includes('Password:')) {
            if (prevStatus === ReplStatus.PASSWORD && passwordSent.current) {
                appendLine('[SYSTEM] Saved password was incorrect. Please enter manually.');
                passwordSent.current = false; // Allow manual entry to work
            }
            return ReplStatus.PASSWORD;
        }
        if (data.includes('WebREPL connected')) {
            return ReplStatus.CONNECTED;
        }
        if (data.includes('logout')) {
            return ReplStatus.DISCONNECTED;
        }
        return prevStatus;
      });
    };

    const onError = (error: Event) => {
      if (effectId.current !== currentEffectId) return; // Stale effect
      console.error('WebSocket Error:', error);
      appendLine('[SYSTEM] A connection error occurred.');
      setStatus(ReplStatus.ERROR);
    };

    const onClose = () => {
        if (effectId.current !== currentEffectId) return; // Stale effect
        setStatus(prevStatus => {
            if (prevStatus !== ReplStatus.ERROR) {
                appendLine('[SYSTEM] Connection closed.');
                // Schedule automatic retry if it was an unexpected close
                if (prevStatus === ReplStatus.CONNECTED || prevStatus === ReplStatus.CONNECTING) {
                  scheduleRetry();
                }
            }
            return ReplStatus.DISCONNECTED;
        });
    };

    socket.onopen = onOpen;
    socket.onmessage = onMessage;
    socket.onerror = onError;
    socket.onclose = onClose;

    return () => {
      // Cleanup is still important to close the socket
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      
      if(socket.readyState < WebSocket.CLOSING) {
        socket.close();
      }
      ws.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, appendLine, reconnectAttempt]);


  // Função especial para comandos de arquivo que não usa reset automático
  const sendFileCommand = useCallback((command: string) => {
    console.log(`[WEBREPL FILE] Sending file command without reset`);
    // Para comandos de arquivo, envia diretamente sem Ctrl+C
    sendData(command + '\r');
  }, [sendData]);

  // Integração com comandos de arquivo
  const fileCommands = useSimpleFileCommands(sendFileCommand);

  // Processar mensagens para comandos de arquivo apenas quando necessário
  useEffect(() => {
    if (lines.length > 0) {
      // Processa toda a mensagem concatenada, não apenas a última linha
      const allMessages = lines.join('\n');
      // Só processa se há marcadores de comando de arquivo
      if (allMessages.includes('__START_') || allMessages.includes('__END_')) {
        fileCommands.processMessage(allMessages);
      }
    }
  }, [lines, fileCommands]);

  return { 
    status, 
    lines, 
    sendData, 
    sendCommand, 
    reconnect,
    fileCommands
  };
};
