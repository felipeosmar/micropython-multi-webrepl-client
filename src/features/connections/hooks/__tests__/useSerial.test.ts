import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSerial } from '../useSerial';
import { ReplStatus } from '../../types';
import { SYSTEM_MESSAGES } from '../../../../shared/constants/system.messages';

// Mock global para navigator.serial
const mockSerial = { getPorts: vi.fn() };
if (!('serial' in global.navigator)) {
  Object.defineProperty(global.navigator, 'serial', {
    value: mockSerial,
    configurable: true,
  });
}

// Mock completo para useSimpleFileCommands
vi.mock('../../../file-manager/hooks', () => ({
  useSimpleFileCommands: vi.fn(() => ({
    processMessage: vi.fn(),
    clearQueue: vi.fn(), // Mock da função clearQueue
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
    createDirectory: vi.fn(),
    listFiles: vi.fn(),
  })),
}));

describe('useSerial', () => {
  let mockPort: any;
  let mockReader: any;
  let mockWriter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSerial.getPorts.mockReset();

    // Mock Writer
    mockWriter = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      releaseLock: vi.fn(),
    };

    // Mock Reader
    let readCallCount = 0;
    mockReader = {
      read: vi.fn().mockImplementation(() => {
        readCallCount++;
        if (readCallCount === 1) {
          return Promise.resolve({ value: new Uint8Array([72, 101, 108, 108, 111]), done: false });
        }
        return Promise.resolve({ value: undefined, done: true });
      }),
      cancel: vi.fn().mockResolvedValue(undefined),
      releaseLock: vi.fn(),
    };

    // Mock dos streams
    const mockReadable = {
      getReader: vi.fn(() => mockReader),
    };
    
    const mockWritable = {
      getWriter: vi.fn(() => mockWriter),
    };

    // Mock Port com estado inicial limpo
    mockPort = {
      getInfo: vi.fn().mockReturnValue({ usbVendorId: 0x1234, usbProductId: 0x5678 }),
      open: vi.fn().mockImplementation(async () => {
        // Após abertura, define os streams como disponíveis
        mockPort.readable = mockReadable;
        mockPort.writable = mockWritable;
        return Promise.resolve();
      }),
      close: vi.fn().mockImplementation(async () => {
        // Ao fechar, remove os streams
        mockPort.readable = null;
        mockPort.writable = null;
        return Promise.resolve();
      }),
      readable: null, // Inicialmente null
      writable: null, // Inicialmente null
    };
    
    // Sempre retorna a porta como disponível
    mockSerial.getPorts.mockResolvedValue([mockPort]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with disconnected status', () => {
      const { result } = renderHook(() => useSerial(null));
      expect(result.current.status).toBe(ReplStatus.DISCONNECTED);
      expect(result.current.lines).toEqual([]);
    });
  });

  describe('Connection Management', () => {
    it('should connect to serial port and set status to connected', async () => {
      const { result } = renderHook(() => useSerial(null)); // Inicia sem porta para evitar auto-conexão
      expect(result.current.status).toBe(ReplStatus.DISCONNECTED);
      
      // Simular manual connection através da função connect
      await act(async () => {
        // Primeiro definir a porta manualmente no hook
        // Isso é um hack para teste, mas vamos simular definindo diretamente
        (result.current as any).portRef = { current: mockPort };
        
        // Agora chamar connect manualmente
        await result.current.connect();
      });
      
      // Verificar o resultado
      console.log('Status após connect:', result.current.status);
      console.log('Lines após connect:', result.current.lines);
      
      expect(result.current.status).toBe(ReplStatus.CONNECTED);
      expect(result.current.lines).toContain(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.CONNECTED}`);
      expect(result.current.lines).toContain(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.REPL_READY}`);
    });

    it('should handle connection errors and set status to error', async () => {
      const error = new Error('Connection failed');
      mockPort.open.mockRejectedValue(error);
      const { result } = renderHook(() => useSerial(mockPort));

      await act(async () => {
        await result.current.connect();
      });

      // Log temporário para depuração
      // eslint-disable-next-line no-console
      console.log('Status após erro:', result.current.status, 'Lines:', result.current.lines);

      await waitFor(() => {
        expect(result.current.status).toBe(ReplStatus.ERROR);
        expect(result.current.lines).toContain(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.CONNECTION_FAILED}: ${error.message}`);
      });
    });

    it('should disconnect from serial port', async () => {
      const { result } = renderHook(() => useSerial(mockPort));

      await act(async () => {
        await result.current.connect();
      });

      await act(async () => {
        await result.current.disconnect();
      });

      // Log temporário para depuração
      // eslint-disable-next-line no-console
      console.log('Status após disconnect:', result.current.status, 'Lines:', result.current.lines);

      await waitFor(() => {
        expect(result.current.status).toBe(ReplStatus.DISCONNECTED);
        expect(result.current.lines).toContain(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.DISCONNECTED}`);
        expect(mockReader.cancel).toHaveBeenCalled();
        expect(mockWriter.close).toHaveBeenCalled();
      });
    });
  });

  describe('Command Sending', () => {
    it('should send command with carriage return by default', async () => {
      const { result } = renderHook(() => useSerial(mockPort));
      await act(async () => { await result.current.connect(); });

      const command = 'print("hello")';
      const expectedData = new TextEncoder().encode(command + '\r');

      await act(async () => {
        result.current.sendCommand(command);
      });

      // Log temporário para depuração
      // eslint-disable-next-line no-console
      console.log('Chamadas do write:', mockWriter.write.mock.calls);

      await waitFor(() => {
        expect(mockWriter.write).toHaveBeenCalledWith(expectedData);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing port on connect', async () => {
      const { result } = renderHook(() => useSerial(null));

      await act(async () => {
        await result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReplStatus.ERROR);
        expect(result.current.lines).toContain(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.SERIAL_PORT_NOT_SELECTED}`);
      });
    });

    it('should handle unavailable port on connect', async () => {
      mockSerial.getPorts.mockResolvedValue([]);
      const { result } = renderHook(() => useSerial(mockPort));

      await act(async () => {
        await result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReplStatus.ERROR);
        expect(result.current.lines).toContain(`[SYSTEM] ${SYSTEM_MESSAGES.CONNECTION.CONNECTION_FAILED}: ${SYSTEM_MESSAGES.CONNECTION.SERIAL_PORT_NOT_AVAILABLE}`);
      });
    });
  });
});