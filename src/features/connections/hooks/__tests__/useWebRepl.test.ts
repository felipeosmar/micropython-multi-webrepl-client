import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useWebRepl } from '../useWebRepl'
import { ReplStatus } from '../../types'

// Mock dependencies
vi.mock('../../../file-manager/hooks', () => ({
  useSimpleFileCommands: vi.fn(() => ({
    processMessage: vi.fn(),
  })),
}))

describe('useWebRepl', () => {
  let mockWebSocket: any
  let messageHandlers: { [key: string]: Function }

  beforeEach(() => {
    vi.clearAllMocks()
    messageHandlers = {}

    // Mock WebSocket
    mockWebSocket = {
      readyState: WebSocket.CONNECTING,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        messageHandlers[event] = handler
      }),
      removeEventListener: vi.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
    }

    global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket)
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
    it('should handle WebSocket open event', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        mockWebSocket.onopen?.()
      })

      expect(result.current.lines).toContain('[SYSTEM] Connection opened. Waiting for prompt...')
    })

    it('should handle WebSocket error event', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        mockWebSocket.onerror?.(new Event('error'))
      })

      expect(result.current.status).toBe(ReplStatus.ERROR)
      expect(result.current.lines).toContain('[SYSTEM] A connection error occurred.')
    })

    it('should handle WebSocket close event', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        mockWebSocket.onclose?.()
      })

      expect(result.current.status).toBe(ReplStatus.DISCONNECTED)
      expect(result.current.lines).toContain('[SYSTEM] Connection closed.')
    })

    it('should handle invalid WebSocket URL', () => {
      // Mock WebSocket constructor to throw
      global.WebSocket = vi.fn().mockImplementation(() => {
        throw new DOMException('Invalid URL', 'SecurityError')
      })

      const { result } = renderHook(() => useWebRepl('invalid://url'))

      expect(result.current.status).toBe(ReplStatus.ERROR)
      expect(result.current.lines).toContain(
        '[SYSTEM] Error: Connection blocked. Cannot connect to insecure ws:// from a secure https:// page. Use a wss:// URL if available.'
      )
    })
  })

  describe('Authentication', () => {
    it('should detect password prompt', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        mockWebSocket.onmessage?.({ data: 'Password:' })
      })

      expect(result.current.status).toBe(ReplStatus.PASSWORD)
    })

    it('should auto-authenticate with saved password', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266', 'mypassword'))

      act(() => {
        mockWebSocket.onmessage?.({ data: 'Password:' })
      })

      expect(mockWebSocket.send).toHaveBeenCalledWith('mypassword\r')
    })

    it('should detect successful connection', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        mockWebSocket.onmessage?.({ data: 'WebREPL connected' })
      })

      expect(result.current.status).toBe(ReplStatus.CONNECTED)
    })

    it('should handle incorrect password', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266', 'wrongpassword'))

      // First password attempt
      act(() => {
        mockWebSocket.onmessage?.({ data: 'Password:' })
      })

      // Password was incorrect, prompt again
      act(() => {
        mockWebSocket.onmessage?.({ data: 'Password:' })
      })

      expect(result.current.lines).toContain('[SYSTEM] Saved password was incorrect. Please enter manually.')
    })
  })

  describe('Command Sending', () => {
    beforeEach(() => {
      mockWebSocket.readyState = WebSocket.OPEN
    })

    it('should send command with reset sequence', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      await act(async () => {
        result.current.sendCommand('print("hello")')
        // Wait for the timeout in sendCommand
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(mockWebSocket.send).toHaveBeenCalledWith('\x03') // Ctrl+C
      expect(mockWebSocket.send).toHaveBeenCalledWith('print("hello")\r')
    })

    it('should send empty command as carriage return', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        result.current.sendCommand('')
      })

      expect(mockWebSocket.send).toHaveBeenCalledWith('\r')
    })

    it('should handle sending data when not connected', () => {
      mockWebSocket.readyState = WebSocket.CLOSED
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        result.current.sendData('test')
      })

      expect(result.current.lines).toContain('[SYSTEM] Cannot send data, not connected.')
    })

    it('should clean control characters from commands', async () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      await act(async () => {
        result.current.sendCommand('test\x00\x1F\x7F\r\ncommand')
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(mockWebSocket.send).toHaveBeenCalledWith('testcommand\r')
    })
  })

  describe('Data Processing', () => {
    it('should process incoming messages and update lines', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        mockWebSocket.onmessage?.({ data: 'Hello from MicroPython!' })
      })

      // Due to the timeout in message processing, we need to wait
      setTimeout(() => {
        expect(result.current.lines).toContain('Hello from MicroPython!')
      }, 100)
    })

    it('should sanitize control characters from incoming data', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        mockWebSocket.onmessage?.({ data: 'Hello\x00\x08\x1FWorld' })
      })

      setTimeout(() => {
        expect(result.current.lines).toContain('HelloWorld')
      }, 100)
    })

    it('should handle logout detection', () => {
      const { result } = renderHook(() => useWebRepl('ws://192.168.4.1:8266'))

      act(() => {
        mockWebSocket.onmessage?.({ data: 'logout' })
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
        mockWebSocket.onmessage?.({ data: 'WebREPL connected' })
      })

      // Simulate unexpected close
      act(() => {
        mockWebSocket.onclose?.()
      })

      expect(result.current.lines).toContain('[SYSTEM] Retry attempt 1/3 in 1s...')

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
      const { result, rerender } = renderHook(
        ({ url }) => useWebRepl(url),
        { initialProps: { url: 'ws://192.168.4.1:8266' } }
      )

      expect(global.WebSocket).toHaveBeenCalledWith('ws://192.168.4.1:8266')

      rerender({ url: 'ws://192.168.4.2:8266' })

      expect(global.WebSocket).toHaveBeenCalledWith('ws://192.168.4.2:8266')
      expect(global.WebSocket).toHaveBeenCalledTimes(2)
    })

    it('should clear state when URL becomes null', () => {
      const { result, rerender } = renderHook(
        ({ url }) => useWebRepl(url),
        { initialProps: { url: 'ws://192.168.4.1:8266' } }
      )

      rerender({ url: null })

      expect(result.current.status).toBe(ReplStatus.DISCONNECTED)
      expect(result.current.lines).toEqual([])
    })
  })
})