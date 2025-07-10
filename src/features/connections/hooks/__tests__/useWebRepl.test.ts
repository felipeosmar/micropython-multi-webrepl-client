import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReplStatus } from '../../types';
import { SYSTEM_MESSAGES } from '../../../../shared/constants/system.messages';

// Mock de dependências ANTES de importar o hook
vi.mock('../../../file-manager/hooks', () => ({
  useSimpleFileCommands: () => ({
    processMessage: vi.fn(),
    clearQueue: vi.fn(),
  }),
}));

import { useWebRepl } from '../useWebRepl';

// Mock dependencies already defined above

describe('useWebRepl', () => {
  let lastWebSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock WebSocket rastreável e compatível com Vitest
    const WebSocketMock = vi.fn().mockImplementation(function (this: any, url: string) {
      lastWebSocket = this;
      this.url = url;
      this.listeners = {};
      this.readyState = 0; // CONNECTING
      this.send = vi.fn();
      this.close = vi.fn();
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;
      this.addEventListener = function (event: string, cb: any) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(cb);
      };
      this.removeEventListener = function (event: string, cb: any) {
        if (this.listeners[event]) {
          this.listeners[event] = this.listeners[event].filter((fn: any) => fn !== cb);
        }
      };
      this._fire = function (event: string, data?: any) {
        // Simula propriedades do WebSocket para diferentes eventos
        if (event === 'open') {
          this.readyState = 1; // OPEN
        } else if (event === 'close') {
          this.readyState = 3; // CLOSED
        } else if (event === 'error') {
          this.readyState = 3; // CLOSED
        }
        
        // Dispara através das propriedades onXXX
        if (typeof this[`on${event}`] === 'function') {
          this[`on${event}`](data);
        }
        // Dispara através de addEventListener
        (this.listeners[event] || []).forEach((fn: any) => fn(data));
      };
    });
    
    // Define as constantes do WebSocket através da interface
    (WebSocketMock as any).CONNECTING = 0;
    (WebSocketMock as any).OPEN = 1;
    (WebSocketMock as any).CLOSING = 2;
    (WebSocketMock as any).CLOSED = 3;
    
    global.WebSocket = WebSocketMock as any;
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with disconnected status for null URL', () => {
      const { result } = renderHook(() => useWebRepl(null))
      
      expect(result.current.status).toBe(ReplStatus.DISCONNECTED)
      expect(result.current.lines).toEqual([])
    })

    it('should start connecting when URL is provided', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))
      
      expect(result.current.status).toBe(ReplStatus.CONNECTING)
      expect(global.WebSocket).toHaveBeenCalledWith('ws://192.168.4.1:8266')
    })
  })

  describe('Connection Management', () => {
    it('should handle WebSocket open event', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'));
      
      // Aguardar que o hook configure o WebSocket
      await waitFor(() => {
        expect(lastWebSocket).toBeDefined();
        expect(lastWebSocket.onopen).toBeDefined();
      });
      
      console.log('Lines antes do evento open:', result.current.lines);
      console.log('Status antes do evento open:', result.current.status);
      console.log('lastWebSocket.onopen existe:', typeof lastWebSocket.onopen);
      
      await act(async () => {
        // Simular evento open através do handler onopen
        lastWebSocket.readyState = 1; // OPEN
        console.log('Chamando onopen...');
        if (lastWebSocket.onopen) {
          const event = { type: 'open', target: lastWebSocket };
          lastWebSocket.onopen(event);
        }
      });
      
      console.log('Lines após evento open:', result.current.lines);
      console.log('Status após evento open:', result.current.status);
      console.log('Mensagem esperada:', SYSTEM_MESSAGES.CONNECTION.CONNECTED);
      
      expect(result.current.lines).toContain(SYSTEM_MESSAGES.CONNECTION.CONNECTED);
    });

    it('should handle WebSocket error event', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'));
      await act(async () => {
        lastWebSocket._fire('error', new Event('error'));
        await new Promise(r => setTimeout(r, 20));
      });
      await waitFor(() => {
        expect(result.current.status).toBe(ReplStatus.ERROR);
        expect(result.current.lines).toContain(SYSTEM_MESSAGES.CONNECTION.CONNECTION_FAILED);
      });
    });

    it('should handle WebSocket close event', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'));
      await act(async () => {
        lastWebSocket._fire('close');
        await new Promise(r => setTimeout(r, 20));
      });
      await waitFor(() => {
        expect(result.current.status).toBe(ReplStatus.DISCONNECTED);
        expect(result.current.lines).toContain(SYSTEM_MESSAGES.CONNECTION.DISCONNECTED);
      });
    });

    it('should handle invalid WebSocket URL', () => {
      global.WebSocket = vi.fn().mockImplementation(() => {
        throw new DOMException('Invalid URL', 'SecurityError');
      }) as any;
      const { result } = renderHook(() => useWebRepl('invalid://url'));
      expect(result.current.status).toBe(ReplStatus.ERROR);
      expect(result.current.lines).toContain(SYSTEM_MESSAGES.ERROR.UNEXPECTED);
    })
  })

  describe('Authentication', () => {
    it('should detect password prompt', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'));
      await act(async () => {
        lastWebSocket._fire('message', { data: 'Password:' });
        await new Promise(r => setTimeout(r, 20));
      });
      expect(result.current.status).toBe(ReplStatus.PASSWORD);
    });

    it('should auto-authenticate with saved password', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266', 'mypassword'));
      await act(async () => {
        lastWebSocket._fire('message', { data: 'Password:' });
        await new Promise(r => setTimeout(r, 20));
      });
      expect(lastWebSocket.send).toHaveBeenCalledWith('mypassword\r');
      expect(result.current.lines).toContain(SYSTEM_MESSAGES.CONNECTION.PASSWORD_SENT);
    });

    it('should detect successful connection', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'));
      await act(async () => {
        lastWebSocket._fire('message', { data: 'WebREPL connected' });
        await new Promise(r => setTimeout(r, 20));
      });
      expect(result.current.status).toBe(ReplStatus.CONNECTED);
    });

    it('should handle incorrect password', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266', 'wrongpassword'));
      await act(async () => {
        lastWebSocket._fire('message', { data: 'Password:' });
        lastWebSocket._fire('message', { data: 'Password:' });
        await new Promise(r => setTimeout(r, 30));
      });
      expect(result.current.lines).toContain(SYSTEM_MESSAGES.CONNECTION.INCORRECT_PASSWORD);
    });
  })

  describe('Command Sending', () => {
    beforeEach(() => {
      lastWebSocket.readyState = 1 // OPEN
    })

    it('should send command with reset sequence', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      await act(async () => {
        result.current.sendCommand('print("hello")')
        // Wait for the timeout in sendCommand
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(lastWebSocket.send).toHaveBeenCalledWith('\x03') // Ctrl+C
      expect(lastWebSocket.send).toHaveBeenCalledWith('print("hello")\r')
    })

    it('should send empty command as carriage return', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        result.current.sendCommand('')
      })

      expect(lastWebSocket.send).toHaveBeenCalledWith('\r')
    })

    it('should handle sending data when not connected', () => {
      lastWebSocket.readyState = 3 // CLOSED
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        result.current.sendData('test')
      })

      expect(result.current.lines).toContain(SYSTEM_MESSAGES.CONNECTION.CONNECTION_FAILED)
    })

    it('should clean control characters from commands', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      await act(async () => {
        result.current.sendCommand('test\x00\x1F\x7F\r\ncommand')
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(lastWebSocket.send).toHaveBeenCalledWith('testcommand\r')
    })
  })

  describe('Data Processing', () => {
    it('should process incoming messages and update lines', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        lastWebSocket.onmessage?.({ data: 'Hello from MicroPython!' })
      })

      await waitFor(() => {
        expect(result.current.lines).toContain('Hello from MicroPython!')
      })
    })

    it('should sanitize control characters from incoming data', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        lastWebSocket.onmessage?.({ data: 'Hello\x00\x08\x1FWorld' })
      })

      await waitFor(() => {
        // Assuming the last line is the one being appended to
        const lastLine = result.current.lines[result.current.lines.length - 1]
        expect(lastLine).toContain('HelloWorld')
      })
    })

    it('should handle logout detection', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        lastWebSocket.onmessage?.({ data: 'logout' })
      })

      expect(result.current.status).toBe(ReplStatus.DISCONNECTED)
    })
  })

  describe('Reconnection', () => {
    it('should provide reconnect functionality', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        result.current.reconnect()
      })

      // Should trigger a new connection attempt
      expect(global.WebSocket).toHaveBeenCalledTimes(2)
    })

    it('should schedule retry on unexpected close', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      // Simulate connected state
      act(() => {
        lastWebSocket.onmessage?.({ data: 'WebREPL connected' })
      })

      // Simulate unexpected close
      act(() => {
        lastWebSocket.onclose?.()
      })

      expect(result.current.lines).toContain(SYSTEM_MESSAGES.CONNECTION.CONNECTION_LOST.replace('...', ' Tentativa 1/3 em 1s...'))

      vi.useRealTimers()
    })
  })

  describe('File Commands Integration', () => {
    it('should provide file commands interface', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      expect(result.current.fileCommands).toBeDefined()
      expect(typeof result.current.fileCommands.processMessage).toBe('function')
    })
  })

  describe('URL Changes', () => {
    it('should reconnect when URL changes', () => {
      const { rerender } = renderHook<
        ReturnType<typeof useWebRepl>,
        { url: string | null }
      >(
        (props) => useWebRepl(props.url),
        { initialProps: { url: 'ws://192.168.4.1:8266' } }
      )

      expect(global.WebSocket).toHaveBeenCalledWith('ws://192.168.4.1:8266')

      rerender({ url: 'ws://192.168.4.2:8266' })

      expect(global.WebSocket).toHaveBeenCalledWith('ws://192.168.4.2:8266')
      expect(global.WebSocket).toHaveBeenCalledTimes(2)
    })

    it('should clear state when URL becomes null', () => {
      const { result, rerender } = renderHook<
        ReturnType<typeof useWebRepl>,
        { url: string | null }
      >(
        (props) => useWebRepl(props.url),
        { initialProps: { url: 'ws://192.168.4.1:8266' } }
      )

      rerender({ url: null })

      expect(result.current.status).toBe(ReplStatus.DISCONNECTED)
      expect(result.current.lines).toEqual([])
    })
  })
})