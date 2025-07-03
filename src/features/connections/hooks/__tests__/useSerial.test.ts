import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSerial } from '../useSerial'
import { ReplStatus } from '../../types'

// Mock dependencies
vi.mock('../../../file-manager/hooks', () => ({
  useSimpleFileCommands: vi.fn(() => ({
    processMessage: vi.fn(),
  })),
}))

describe('useSerial', () => {
  let mockPort: Partial<SerialPort>
  let mockReader: any
  let mockWriter: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock reader
    mockReader = {
      read: vi.fn(),
      cancel: vi.fn().mockResolvedValue(undefined),
    }

    // Mock writer
    mockWriter = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }

    // Mock serial port
    mockPort = {
      getInfo: vi.fn().mockReturnValue({
        usbVendorId: 0x1234,
        usbProductId: 0x5678,
      }),
      open: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      readable: new ReadableStream({
        start(controller) {
          // Mock readable stream
        },
      }),
      writable: new WritableStream({
        write(chunk) {
          // Mock writable stream
        },
      }),
    }

    // Mock stream APIs
    global.TextDecoderStream = vi.fn().mockImplementation(() => ({
      readable: {
        getReader: () => mockReader,
      },
      writable: new WritableStream(),
    }))

    global.TextEncoder = vi.fn().mockImplementation(() => ({
      encode: vi.fn((text) => new Uint8Array([...text].map(c => c.charCodeAt(0)))),
    }))

    // Mock WritableStream.getWriter
    Object.defineProperty(mockPort.writable, 'getWriter', {
      value: vi.fn().mockReturnValue(mockWriter),
    })

    // Mock navigator.serial
    Object.defineProperty(global.navigator, 'serial', {
      value: {
        getPorts: vi.fn().mockResolvedValue([mockPort]),
      },
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with disconnected status', () => {
      const { result } = renderHook(() => useSerial(null))
      
      expect(result.current.status).toBe(ReplStatus.DISCONNECTED)
      expect(result.current.lines).toEqual([])
    })

    it('should initialize with default parameters', () => {
      const { result } = renderHook(() => useSerial(mockPort as SerialPort))
      
      expect(result.current.autoScroll).toBe(true)
    })
  })

  describe('Connection Management', () => {
    it('should connect to serial port', async () => {
      const { result } = renderHook(() => useSerial(mockPort as SerialPort))

      await act(async () => {
        await result.current.connect()
      })

      expect(mockPort.open).toHaveBeenCalledWith({
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      })
      expect(result.current.status).toBe(ReplStatus.CONNECTED)
    })

    it('should handle connection errors', async () => {
      mockPort.open = vi.fn().mockRejectedValue(new Error('Connection failed'))
      const { result } = renderHook(() => useSerial(mockPort as SerialPort))

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.status).toBe(ReplStatus.ERROR)
      expect(result.current.lines).toContain('[SYSTEM] Connection Error: Connection failed')
    })

    it('should disconnect from serial port', async () => {
      const { result } = renderHook(() => useSerial(mockPort as SerialPort))

      // First connect
      await act(async () => {
        await result.current.connect()
      })

      // Then disconnect
      await act(async () => {
        await result.current.disconnect()
      })

      expect(result.current.status).toBe(ReplStatus.DISCONNECTED)
      expect(mockReader.cancel).toHaveBeenCalled()
      expect(mockWriter.close).toHaveBeenCalled()
    })
  })

  describe('Command Sending', () => {
    it('should send command with carriage return by default', async () => {
      const { result } = renderHook(() => useSerial(mockPort as SerialPort))

      await act(async () => {
        await result.current.connect()
      })

      await act(async () => {
        result.current.sendCommand('print("hello")')
      })

      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.any(Uint8Array) // Contains encoded 'print("hello")\r'
      )
    })

    it('should send empty command as carriage return', async () => {
      const { result } = renderHook(() => useSerial(mockPort as SerialPort))

      await act(async () => {
        await result.current.connect()
      })

      await act(async () => {
        result.current.sendCommand('')
      })

      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.any(Uint8Array) // Contains encoded '\r'
      )
    })

    it('should handle different line endings', async () => {
      const { result } = renderHook(() => 
        useSerial(mockPort as SerialPort, 115200, 'newline')
      )

      await act(async () => {
        await result.current.connect()
      })

      await act(async () => {
        result.current.sendCommand('test')
      })

      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.any(Uint8Array) // Contains encoded 'test\n'
      )
    })
  })

  describe('Data Processing', () => {
    it('should clear output', () => {
      const { result } = renderHook(() => useSerial(mockPort as SerialPort))

      act(() => {
        result.current.clearOutput()
      })

      expect(result.current.lines).toEqual([])
    })

    it('should check port availability', async () => {
      const { result } = renderHook(() => useSerial(mockPort as SerialPort))

      const isAvailable = await act(async () => {
        return await result.current.checkPortAvailability()
      })

      expect(isAvailable).toBe(true)
      expect(global.navigator.serial.getPorts).toHaveBeenCalled()
    })
  })

  describe('Configuration Options', () => {
    it('should handle custom baud rate', () => {
      const customBaudRate = 9600
      const { result } = renderHook(() => 
        useSerial(mockPort as SerialPort, customBaudRate)
      )

      act(async () => {
        await result.current.connect()
      })

      expect(mockPort.open).toHaveBeenCalledWith(
        expect.objectContaining({
          baudRate: customBaudRate,
        })
      )
    })

    it('should handle autoscroll configuration', () => {
      const { result } = renderHook(() => 
        useSerial(mockPort as SerialPort, 115200, 'carriageReturn', false)
      )

      expect(result.current.autoScroll).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing port', async () => {
      const { result } = renderHook(() => useSerial(null))

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.status).toBe(ReplStatus.ERROR)
      expect(result.current.lines).toContain('[SYSTEM] Error: No serial port provided.')
    })

    it('should handle unavailable port', async () => {
      global.navigator.serial.getPorts = vi.fn().mockResolvedValue([])
      const { result } = renderHook(() => useSerial(mockPort as SerialPort))

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.status).toBe(ReplStatus.ERROR)
    })
  })
})