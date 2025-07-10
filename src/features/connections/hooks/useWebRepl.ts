import { useState, useEffect, useRef, useCallback } from 'react';
import { ReplStatus } from '../types';
import { SYSTEM_MESSAGES } from '../../../shared/constants/system.messages';

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
  const isAutoRetrying = useRef(false); // Flag para controlar se está em retry automático


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
      appendLine(SYSTEM_MESSAGES.CONNECTION.CONNECTION_FAILED);
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
    isAutoRetrying.current = false; // Reset auto retry flag
    setReconnectAttempt(c => c + 1);
  }, []);

  /**
   * Tentativa automática de reconexão com exponential backoff
   */
  const scheduleRetry = useCallback(() => {
    // Só agenda retry se não estiver já em processo e não tiver excedido tentativas
    if (!isAutoRetrying.current && retryCount.current < maxRetries) {
      isAutoRetrying.current = true;
      retryCount.current += 1;
      appendLine(SYSTEM_MESSAGES.CONNECTION.CONNECTION_LOST.replace('...', ` Tentativa ${retryCount.current}/${maxRetries} em ${retryDelay.current/1000}s...`));
      
      setTimeout(() => {
        setReconnectAttempt(c => c + 1);
      }, retryDelay.current);
      
      // Exponential backoff: double the delay for next retry
      retryDelay.current = Math.min(retryDelay.current * 2, 10000); // Max 10 seconds
    } else if (retryCount.current >= maxRetries && isAutoRetrying.current) {
      // Atingiu o máximo de tentativas
      appendLine(SYSTEM_MESSAGES.ERROR.OPERATION_FAILED);
      appendLine('Reconexão automática falhou. Use o botão para tentar novamente.');
      retryCount.current = 0;
      retryDelay.current = 1000;
      isAutoRetrying.current = false; // Para o retry automático
    }
  }, [appendLine]);


  useEffect(() => {
    if (status === ReplStatus.PASSWORD && password && !passwordSent.current) {
      appendLine(SYSTEM_MESSAGES.CONNECTION.PASSWORD_SENT);
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
    appendLine(SYSTEM_MESSAGES.CONNECTION.CONNECTING + url + '...');
    setStatus(ReplStatus.CONNECTING);
    
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (error) {
        console.error("WebSocket connection error:", error);
        let errorMessage = SYSTEM_MESSAGES.CONNECTION.INVALID_IP;
        // This handles the mixed-content security error
        if (error instanceof DOMException && error.name === 'SecurityError') {
             errorMessage = SYSTEM_MESSAGES.ERROR.UNEXPECTED;
        }
        appendLine(errorMessage);
        setStatus(ReplStatus.ERROR);
        return;
    }

    ws.current = socket;

    const onOpen = () => {
      console.log('WebSocket onOpen called, effectId check:', effectId.current, currentEffectId);
      if (effectId.current !== currentEffectId) {
        console.log('Stale effect detected, ignoring');
        return; // Stale effect
      }
      console.log('Adding connection message to lines');
      appendLine(SYSTEM_MESSAGES.CONNECTION.CONNECTED);
    };

    const onMessage = (event: MessageEvent) => {
      if (effectId.current !== currentEffectId) return; // Stale effect
      const data = event.data as string;
      
      // Dados normais do terminal
      appendLine(data);
      
      // Detecta estado da conexão
      setStatus(prevStatus => {
        if (data.includes('Password:')) {
            if (prevStatus === ReplStatus.PASSWORD && passwordSent.current) {
                appendLine(SYSTEM_MESSAGES.CONNECTION.INCORRECT_PASSWORD);
                passwordSent.current = false; // Allow manual entry to work
            }
            return ReplStatus.PASSWORD;
        }
        if (data.includes('WebREPL connected')) {
            // Conexão bem sucedida, reseta flags de retry
            retryCount.current = 0;
            retryDelay.current = 1000;
            isAutoRetrying.current = false;
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
      appendLine(SYSTEM_MESSAGES.CONNECTION.CONNECTION_FAILED);
      setStatus(ReplStatus.ERROR);
    };

    const onClose = () => {
        if (effectId.current !== currentEffectId) return; // Stale effect
        setStatus(prevStatus => {
            if (prevStatus !== ReplStatus.ERROR) {
                appendLine(SYSTEM_MESSAGES.CONNECTION.DISCONNECTED);
                // Schedule automatic retry if it was an unexpected close
                // Mas só se ainda não estiver em retry e não tiver excedido tentativas
                if ((prevStatus === ReplStatus.CONNECTED || prevStatus === ReplStatus.CONNECTING) && 
                    !isAutoRetrying.current) {
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

  // Função especial para comandos de monitoramento que não interfere com a fila de comandos
  const sendDirectCommand = useCallback((command: string) => {
    if (command.trim() === '') return;
    
    console.log(`[WEBREPL DIRECT] Sending direct command: ${command.substring(0, 50)}...`);
    // Para comandos de monitoramento, envia diretamente sem Ctrl+C e sem interferir na fila
    sendData(command + '\r');
  }, [sendData]);

  return { 
    status, 
    lines, 
    sendData, 
    sendCommand, 
    sendDirectCommand,
    reconnect
  };
};
