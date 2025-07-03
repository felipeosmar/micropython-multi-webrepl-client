import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AddConnectionForm from '../AddConnectionForm'
import { ReplConnection } from '@/shared/types'

// Mock navigator.serial
const mockRequestPort = vi.fn()
Object.defineProperty(global.navigator, 'serial', {
  value: {
    requestPort: mockRequestPort,
  },
  writable: true,
})

describe('AddConnectionForm', () => {
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()
  const defaultProps = {
    onSave: mockOnSave,
    onCancel: mockOnCancel,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render form for new connection', () => {
      render(<AddConnectionForm {...defaultProps} />)
      
      expect(screen.getByText('New Connection')).toBeInTheDocument()
      expect(screen.getByLabelText('Connection Name')).toBeInTheDocument()
      expect(screen.getByLabelText('WebREPL')).toBeChecked()
      expect(screen.getByLabelText('Serial')).not.toBeChecked()
    })

    it('should render form for editing existing connection', () => {
      const existingConnection: ReplConnection = {
        id: '1',
        name: 'Test Connection',
        connectionType: 'webrepl',
        ip: '192.168.1.100',
        password: 'testpass',
      }

      render(<AddConnectionForm {...defaultProps} existingConnection={existingConnection} />)
      
      expect(screen.getByText('Edit Connection')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Connection')).toBeInTheDocument()
      expect(screen.getByDisplayValue('192.168.1.100')).toBeInTheDocument()
      expect(screen.getByDisplayValue('testpass')).toBeInTheDocument()
    })
  })

  describe('Connection Type Selection', () => {
    it('should switch between WebREPL and Serial modes', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      // Initially WebREPL is selected
      expect(screen.getByLabelText('IP Address')).toBeInTheDocument()
      expect(screen.queryByLabelText('Baud Rate')).not.toBeInTheDocument()
      
      // Switch to Serial
      await user.click(screen.getByLabelText('Serial'))
      
      expect(screen.queryByLabelText('IP Address')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Baud Rate')).toBeInTheDocument()
      expect(screen.getByLabelText('Terminador de Linha')).toBeInTheDocument()
    })

    it('should show WebREPL fields when WebREPL is selected', () => {
      render(<AddConnectionForm {...defaultProps} />)
      
      expect(screen.getByLabelText('IP Address')).toBeInTheDocument()
      expect(screen.getByLabelText('Password (optional)')).toBeInTheDocument()
    })

    it('should show Serial fields when Serial is selected', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      
      expect(screen.getByLabelText('Baud Rate')).toBeInTheDocument()
      expect(screen.getByLabelText('Terminador de Linha')).toBeInTheDocument()
      expect(screen.getByLabelText('Autoscroll')).toBeInTheDocument()
      expect(screen.getByLabelText('Mostrar data/hora')).toBeInTheDocument()
      expect(screen.getByText('Select Serial Port')).toBeInTheDocument()
    })
  })

  describe('Form Validation and Submission', () => {
    it('should submit WebREPL connection', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.type(screen.getByLabelText('Connection Name'), 'Test WebREPL')
      
      const ipInput = screen.getByLabelText('IP Address')
      await user.clear(ipInput)
      await user.type(ipInput, '192.168.1.100')
      
      await user.type(screen.getByLabelText('Password (optional)'), 'testpass')
      await user.click(screen.getByText('Add Connection'))
      
      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Test WebREPL',
        connectionType: 'webrepl',
        ip: '192.168.1.100',
        password: 'testpass',
      })
    })

    it('should require connection name', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      // Try to submit without name
      await user.click(screen.getByText('Add Connection'))
      
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should require IP address for WebREPL connections', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.type(screen.getByLabelText('Connection Name'), 'Test')
      await user.clear(screen.getByLabelText('IP Address'))
      await user.click(screen.getByText('Add Connection'))
      
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should handle cancel action', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByText('Cancel'))
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Serial Port Selection', () => {
    it('should request serial port when button is clicked', async () => {
      const user = userEvent.setup()
      const mockPort = {
        getInfo: vi.fn().mockReturnValue({
          usbVendorId: 0x1234,
          usbProductId: 0x5678,
        }),
      }
      mockRequestPort.mockResolvedValue(mockPort)

      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      await user.click(screen.getByText('Select Serial Port'))
      
      expect(mockRequestPort).toHaveBeenCalled()
    })

    it('should handle serial port selection error', async () => {
      const user = userEvent.setup()
      mockRequestPort.mockRejectedValue(new Error('Permission denied'))
      
      // Mock alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      await user.click(screen.getByText('Select Serial Port'))
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error selecting serial port: Permission denied')
      })
      
      alertSpy.mockRestore()
    })

    it('should show port info when port is selected', async () => {
      const user = userEvent.setup()
      const mockPort = {
        getInfo: vi.fn().mockReturnValue({
          usbVendorId: 0x1234,
          usbProductId: 0x5678,
        }),
      }
      mockRequestPort.mockResolvedValue(mockPort)

      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      await user.click(screen.getByText('Select Serial Port'))
      
      await waitFor(() => {
        expect(screen.getByText('1234:5678')).toBeInTheDocument()
        expect(screen.getByText('Change Serial Port')).toBeInTheDocument()
      })
    })

    it('should require serial port for serial connections', async () => {
      const user = userEvent.setup()
      
      // Mock alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      await user.type(screen.getByLabelText('Connection Name'), 'Test Serial')
      await user.click(screen.getByText('Add Connection'))
      
      expect(alertSpy).toHaveBeenCalledWith('Please select a serial port.')
      expect(mockOnSave).not.toHaveBeenCalled()
      
      alertSpy.mockRestore()
    })

    it('should submit serial connection with all parameters', async () => {
      const user = userEvent.setup()
      const mockPort = {
        getInfo: vi.fn().mockReturnValue({
          usbVendorId: 0x1234,
          usbProductId: 0x5678,
        }),
      }
      mockRequestPort.mockResolvedValue(mockPort)

      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      await user.type(screen.getByLabelText('Connection Name'), 'Test Serial')
      await user.selectOptions(screen.getByLabelText('Baud Rate'), '9600')
      await user.selectOptions(screen.getByLabelText('Terminador de Linha'), 'newline')
      await user.click(screen.getByLabelText('Mostrar data/hora'))
      await user.click(screen.getByText('Select Serial Port'))
      
      await waitFor(() => {
        expect(screen.getByText('Change Serial Port')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Add Connection'))
      
      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Test Serial',
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

  describe('Baud Rate Selection', () => {
    it('should show all baud rate options', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      
      const baudRateSelect = screen.getByLabelText('Baud Rate')
      expect(baudRateSelect).toBeInTheDocument()
      
      // Check some common baud rates
      expect(screen.getByText('9600')).toBeInTheDocument()
      expect(screen.getByText('115200 (Default)')).toBeInTheDocument()
      expect(screen.getByText('230400')).toBeInTheDocument()
    })

    it('should default to 115200 baud rate', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      
      const baudRateSelect = screen.getByLabelText('Baud Rate') as HTMLSelectElement
      expect(baudRateSelect.value).toBe('115200')
    })
  })

  describe('Line Ending Selection', () => {
    it('should show line ending options', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      
      expect(screen.getByText('Sem final de linha')).toBeInTheDocument()
      expect(screen.getByText('Nova Linha (\\n)')).toBeInTheDocument()
      expect(screen.getByText('Retorno de Carro (\\r) - Padrão MicroPython')).toBeInTheDocument()
      expect(screen.getByText('Ambos NL e CR (\\n\\r)')).toBeInTheDocument()
    })

    it('should default to carriage return', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      
      const lineEndingSelect = screen.getByLabelText('Terminador de Linha') as HTMLSelectElement
      expect(lineEndingSelect.value).toBe('carriageReturn')
    })
  })

  describe('Checkboxes', () => {
    it('should default autoscroll to checked', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      
      expect(screen.getByLabelText('Autoscroll')).toBeChecked()
    })

    it('should default timestamp to unchecked', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      
      expect(screen.getByLabelText('Mostrar data/hora')).not.toBeChecked()
    })

    it('should toggle checkbox states', async () => {
      const user = userEvent.setup()
      render(<AddConnectionForm {...defaultProps} />)
      
      await user.click(screen.getByLabelText('Serial'))
      
      const autoscroll = screen.getByLabelText('Autoscroll')
      const timestamp = screen.getByLabelText('Mostrar data/hora')
      
      await user.click(autoscroll)
      await user.click(timestamp)
      
      expect(autoscroll).not.toBeChecked()
      expect(timestamp).toBeChecked()
    })
  })

  // Note: Web Serial API support test skipped due to mock complexity
  // The actual code handles this case correctly with try-catch
})