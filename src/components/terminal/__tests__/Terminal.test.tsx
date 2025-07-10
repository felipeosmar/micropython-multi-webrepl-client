import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Terminal from '../Terminal'

describe('Terminal', () => {
  const mockOnCommand = vi.fn()
  const mockOnClear = vi.fn()
  const defaultProps = {
    lines: [],
    onCommand: mockOnCommand,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render empty terminal correctly', () => {
      render(<Terminal {...defaultProps} />)
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByText('>>>')).toBeInTheDocument()
    })

    it('should render lines correctly', () => {
      const lines = ['Line 1', 'Line 2', 'Line 3']
      render(<Terminal {...defaultProps} lines={lines} />)
      
      lines.forEach(line => {
        expect(screen.getByText(line)).toBeInTheDocument()
      })
    })

    it('should apply error styling to error messages', () => {
      const lines = ['[SYSTEM] Error: Something went wrong']
      render(<Terminal {...defaultProps} lines={lines} />)
      
      const errorElement = screen.getByText('[SYSTEM] Error: Something went wrong')
      expect(errorElement).toHaveClass('text-red-400')
    })

    it('should apply system styling to system messages', () => {
      const lines = ['[SYSTEM] Connected successfully']
      render(<Terminal {...defaultProps} lines={lines} />)
      
      const systemElement = screen.getByText('[SYSTEM] Connected successfully')
      expect(systemElement).toHaveClass('text-yellow-400')
    })

    it('should render clear button when onClear is provided', () => {
      render(<Terminal {...defaultProps} onClear={mockOnClear} />)
      
      expect(screen.getByText('Limpar saída')).toBeInTheDocument()
    })

    it('should not render clear button when onClear is not provided', () => {
      render(<Terminal {...defaultProps} />)
      
      expect(screen.queryByText('Limpar saída')).not.toBeInTheDocument()
    })
  })

  describe('Command Input', () => {
    it('should handle text input', async () => {
      const user = userEvent.setup()
      render(<Terminal {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'print("hello")')
      
      expect(input).toHaveValue('print("hello")')
    })

    it('should submit command on form submission', async () => {
      const user = userEvent.setup()
      render(<Terminal {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'print("hello")')
      await user.keyboard('{Enter}')
      
      expect(mockOnCommand).toHaveBeenCalledWith('print("hello")')
      expect(input).toHaveValue('')
    })

    it('should clear input after submission', async () => {
      const user = userEvent.setup()
      render(<Terminal {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test command')
      await user.keyboard('{Enter}')
      
      expect(input).toHaveValue('')
    })

    it('should handle empty command submission', async () => {
      const user = userEvent.setup()
      render(<Terminal {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Enter}')
      
      expect(mockOnCommand).toHaveBeenCalledWith('')
    })
  })

  describe('Command History', () => {
    it('should navigate history with arrow keys', async () => {
      const user = userEvent.setup()
      render(<Terminal {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      
      // Add commands to history
      await user.type(input, 'command1')
      await user.keyboard('{Enter}')
      await user.type(input, 'command2')
      await user.keyboard('{Enter}')
      
      // Navigate up in history
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('command2')
      
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('command1')
      
      // Navigate down in history
      await user.keyboard('{ArrowDown}')
      expect(input).toHaveValue('command2')
      
      await user.keyboard('{ArrowDown}')
      expect(input).toHaveValue('')
    })

    it('should not add empty commands to history', async () => {
      const user = userEvent.setup()
      render(<Terminal {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      
      // Submit empty command
      await user.keyboard('{Enter}')
      
      // Submit non-empty command
      await user.type(input, 'test')
      await user.keyboard('{Enter}')
      
      // Navigate up - should only show the non-empty command
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('test')
      
      // Navigate up again - should stay on the same command
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('test')
    })

    it('should handle escape key to clear current input', async () => {
      const user = userEvent.setup()
      render(<Terminal {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'some text')
      await user.keyboard('{Escape}')
      
      expect(input).toHaveValue('')
    })

    it('should maintain history between sessions', async () => {
      const user = userEvent.setup()
      render(<Terminal {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      
      // Add command to history
      await user.type(input, 'persistent command')
      await user.keyboard('{Enter}')
      
      // Type new command but don't submit
      await user.type(input, 'current command')
      
      // Navigate to history
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveValue('persistent command')
    })
  })

  describe('Clear Functionality', () => {
    it('should call onClear when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<Terminal {...defaultProps} onClear={mockOnClear} />)
      
      const clearButton = screen.getByText('Limpar saída')
      await user.click(clearButton)
      
      expect(mockOnClear).toHaveBeenCalledTimes(1)
    })
  })

  describe('Focus Management', () => {
    it('should focus input when container is clicked', async () => {
      const user = userEvent.setup()
      render(<Terminal {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      const container = input.closest('div')
      
      // Remove focus first
      input.blur()
      expect(input).not.toHaveFocus()
      
      // Click container
      if (container) {
        await user.click(container)
      }
      
      expect(input).toHaveFocus()
    })
  })

  describe('Auto Scroll', () => {
    it('should scroll to bottom when autoScroll is true', async () => {
      const scrollToMock = vi.fn()
      
      // Mock scrollTo method
      Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
        set: scrollToMock,
        configurable: true,
      })
      
      const { rerender } = render(<Terminal {...defaultProps} autoScroll={true} lines={['line1']} />)
      
      // Add new line to trigger scroll
      rerender(<Terminal {...defaultProps} autoScroll={true} lines={['line1', 'line2']} />)
      
      await waitFor(() => {
        expect(scrollToMock).toHaveBeenCalled()
      })
    })

    it('should not auto-scroll when autoScroll is false', async () => {
      const scrollToMock = vi.fn()
      
      Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
        set: scrollToMock,
        configurable: true,
      })
      
      const { rerender } = render(<Terminal {...defaultProps} autoScroll={false} lines={['line1']} />)
      
      rerender(<Terminal {...defaultProps} autoScroll={false} lines={['line1', 'line2']} />)
      
      // Wait a bit to ensure scroll doesn't happen
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(scrollToMock).not.toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should handle large number of lines efficiently', () => {
      const manyLines = Array.from({ length: 1000 }, (_, i) => `Line ${i}`)
      
      const { container } = render(<Terminal {...defaultProps} lines={manyLines} />)
      
      expect(container).toBeInTheDocument()
      expect(screen.getByText('Line 0')).toBeInTheDocument()
      expect(screen.getByText('Line 999')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<Terminal {...defaultProps} />)
      
      const form = screen.getByRole('textbox').closest('form')
      expect(form).toBeInTheDocument()
    })

    it('should have proper input attributes', () => {
      render(<Terminal {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('autoComplete', 'off')
      expect(input).toHaveAttribute('autoCapitalize', 'off')
      expect(input).toHaveAttribute('autoCorrect', 'off')
    })
  })
})