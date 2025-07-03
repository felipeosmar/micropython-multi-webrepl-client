import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AddConnectionForm from '@/components/forms/AddConnectionForm'
import Terminal from '@/components/terminal/Terminal'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock navigator.serial
const mockRequestPort = vi.fn()
Object.defineProperty(global.navigator, 'serial', {
  value: {
    requestPort: mockRequestPort,
    getPorts: vi.fn().mockResolvedValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
})

describe('Connection Workflow Integration Tests', () => {
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()
  const mockOnCommand = vi.fn()
  const mockOnClear = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Form and Terminal Integration', () => {
    it('should create WebREPL connection configuration', async () => {
      const user = userEvent.setup()
      
      render(<AddConnectionForm onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      await user.type(screen.getByLabelText('Connection Name'), 'ESP32 WebREPL')
      
      const ipInput = screen.getByLabelText('IP Address')
      await user.clear(ipInput)
      await user.type(ipInput, '192.168.4.1')
      
      await user.type(screen.getByLabelText('Password (optional)'), 'mypassword')
      await user.click(screen.getByText('Add Connection'))

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'ESP32 WebREPL',
        connectionType: 'webrepl',
        ip: '192.168.4.1',
        password: 'mypassword',
      })
    })

    it('should create Serial connection configuration', async () => {
      const user = userEvent.setup()
      const mockPort = {
        getInfo: vi.fn().mockReturnValue({
          usbVendorId: 0x1234,
          usbProductId: 0x5678,
        }),
      }
      mockRequestPort.mockResolvedValue(mockPort)
      
      render(<AddConnectionForm onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      await user.click(screen.getByLabelText('Serial'))
      await user.type(screen.getByLabelText('Connection Name'), 'Arduino Serial')
      await user.selectOptions(screen.getByLabelText('Baud Rate'), '9600')
      await user.selectOptions(screen.getByLabelText('Terminador de Linha'), 'newline')
      await user.click(screen.getByLabelText('Mostrar data/hora'))
      
      await user.click(screen.getByText('Select Serial Port'))
      
      await waitFor(() => {
        expect(mockRequestPort).toHaveBeenCalled()
      })

      await user.click(screen.getByText('Add Connection'))

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Arduino Serial',
        connectionType: 'serial',
        ip: '',
        port: mockPort,
        baudRate: 9600,
        portInfo: {
          vendorId: 0x1234,
          productId: 0x5678,
        },
        lineEnding: 'newline',
        autoScroll: true,
        showTimestamp: true,
      })
    })
  })

  describe('Terminal Workflow', () => {
    it('should handle complete terminal interaction workflow', async () => {
      const user = userEvent.setup()
      
      render(
        <Terminal 
          lines={['Welcome to MicroPython!', '>>> ']} 
          onCommand={mockOnCommand}
          onClear={mockOnClear}
          autoScroll={true}
        />
      )

      const input = screen.getByRole('textbox')
      
      // Send first command
      await user.type(input, 'print("Hello")')
      await user.keyboard('{Enter}')
      
      expect(mockOnCommand).toHaveBeenCalledWith('print("Hello")')
      
      // Send second command
      await user.type(input, 'x = 42')
      await user.keyboard('{Enter}')
      
      expect(mockOnCommand).toHaveBeenCalledWith('x = 42')
      
      // Test history navigation
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('x = 42')
      
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('print("Hello")')
      
      // Clear terminal
      await user.click(screen.getByText('Limpar saída'))
      expect(mockOnClear).toHaveBeenCalled()
    })

    it('should handle terminal with error and system messages', () => {
      const lines = [
        'Welcome to MicroPython!',
        '[SYSTEM] Connected to ESP32',
        '[SYSTEM] Error: Connection failed',
        '>>> print("test")',
        'test',
      ]
      
      render(<Terminal lines={lines} onCommand={mockOnCommand} />)
      
      expect(screen.getByText('Welcome to MicroPython!')).toBeInTheDocument()
      expect(screen.getByText('[SYSTEM] Connected to ESP32')).toHaveClass('text-yellow-400')
      expect(screen.getByText('[SYSTEM] Error: Connection failed')).toHaveClass('text-red-400')
      expect(screen.getByText('>>> print("test")')).toBeInTheDocument()
      expect(screen.getByText('test')).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('should handle form cancellation', async () => {
      const user = userEvent.setup()
      
      render(<AddConnectionForm onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      await user.type(screen.getByLabelText('Connection Name'), 'Test')
      await user.click(screen.getByText('Cancel'))
      
      expect(mockOnCancel).toHaveBeenCalled()
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should edit existing connection', async () => {
      const user = userEvent.setup()
      const existingConnection = {
        id: '1',
        name: 'ESP32 Original',
        connectionType: 'webrepl' as const,
        ip: '192.168.4.1',
        password: 'oldpass',
      }
      
      render(
        <AddConnectionForm 
          onSave={mockOnSave} 
          onCancel={mockOnCancel}
          existingConnection={existingConnection}
        />
      )
      
      expect(screen.getByText('Edit Connection')).toBeInTheDocument()
      expect(screen.getByDisplayValue('ESP32 Original')).toBeInTheDocument()
      
      const nameInput = screen.getByDisplayValue('ESP32 Original')
      await user.clear(nameInput)
      await user.type(nameInput, 'ESP32 Updated')
      
      await user.click(screen.getByText('Save Changes'))
      
      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'ESP32 Updated',
        connectionType: 'webrepl',
        ip: '192.168.4.1',
        password: 'oldpass',
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle serial port selection errors gracefully', async () => {
      const user = userEvent.setup()
      mockRequestPort.mockRejectedValue(new Error('User cancelled'))
      
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      
      render(<AddConnectionForm onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      await user.click(screen.getByLabelText('Serial'))
      await user.click(screen.getByText('Select Serial Port'))
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error selecting serial port: User cancelled')
      })
      
      alertSpy.mockRestore()
    })

    it('should handle form validation errors', async () => {
      const user = userEvent.setup()
      
      render(<AddConnectionForm onSave={mockOnSave} onCancel={mockOnCancel} />)
      
      // Try to submit without filling required fields
      await user.click(screen.getByText('Add Connection'))
      
      // Form should not submit due to HTML5 validation
      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })
})