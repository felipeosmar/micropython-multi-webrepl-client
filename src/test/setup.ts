import '@testing-library/jest-dom'

// Fix for React DOM in test environment
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost',
    origin: 'http://localhost',
    protocol: 'http:',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
})

// Mock Web Serial API
Object.defineProperty(global.navigator, 'serial', {
  value: {
    requestPort: vi.fn(),
    getPorts: vi.fn().mockResolvedValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
})

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
}))

// Mock WebSocket constants
Object.defineProperty(global.WebSocket, 'CONNECTING', { value: 0 })
Object.defineProperty(global.WebSocket, 'OPEN', { value: 1 })
Object.defineProperty(global.WebSocket, 'CLOSING', { value: 2 })
Object.defineProperty(global.WebSocket, 'CLOSED', { value: 3 })

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => null),
    removeItem: vi.fn(() => null),
    clear: vi.fn(() => null),
  },
  writable: true,
})

// Mock console methods to reduce noise in tests
Object.defineProperty(console, 'log', {
  value: vi.fn(),
  writable: true,
})

Object.defineProperty(console, 'error', {
  value: vi.fn(),
  writable: true,
})