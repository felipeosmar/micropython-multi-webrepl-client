import React, { useState, useEffect, useRef } from 'react';

/**
 * Props do componente Terminal
 */
interface TerminalProps {
  /** Linhas de texto a serem exibidas no terminal */
  lines: string[];
  /** Função chamada quando um comando é enviado */
  onCommand: (command: string) => void;
  /** Se deve rolar automaticamente para baixo */
  autoScroll?: boolean;
  /** Função para limpar o terminal */
  onClear?: () => void;
}

/**
 * Componente Terminal interativo para comunicação REPL
 * 
 * Funcionalidades:
 * - Exibição de linhas com sintaxe colorida
 * - Campo de entrada de comandos
 * - Histórico de comandos (setas para cima/baixo)
 * - Autoscroll opcional
 * - Botão de limpeza
 * - Foco automático no campo de entrada
 */
const Terminal: React.FC<TerminalProps> = ({ lines, onCommand, autoScroll = true, onClear }) => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const endOfLinesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoScroll) {
      endOfLinesRef.current?.scrollIntoView();
    }
  }, [lines, autoScroll]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(e.target.value);
  };

  /**
   * Processa o envio de comando via formulário
   * Adiciona ao histórico e limpa o campo
   */
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCommand(command);
    if (command.trim()) {
      setHistory(prev => [command, ...prev]);
      setHistoryIndex(-1);
    }
    setCommand('');
  };

  /**
   * Gerencia navegação no histórico de comandos
   * - Seta para cima: comando anterior
   * - Seta para baixo: próximo comando
   * - Escape: limpa campo atual
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setCommand('');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCommand('');
    }
  };

  return (
    <div className="font-mono text-sm text-gray-300 h-full flex flex-col" onClick={() => inputRef.current?.focus()}>
      <div className="flex-grow overflow-y-auto pr-2">
        {lines.map((line, index) => {
          const isError = line.includes('[SYSTEM] Error:');
          const isSystem = line.startsWith('[SYSTEM]');
          const style = isError
            ? 'text-red-400'
            : isSystem
            ? 'text-yellow-400'
            : '';
          return (
             <pre key={index} className={`whitespace-pre-wrap break-words leading-tight ${style}`}>{line}</pre>
          );
        })}
        <div ref={endOfLinesRef} />
      </div>
      <div className="flex flex-col pt-1">
        {onClear && (
          <div className="flex justify-end mb-1">
            <button
              type="button"
              onClick={onClear}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              Limpar saída
            </button>
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="flex items-center">
          <span className="text-green-400 mr-2">&gt;&gt;&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-gray-100 flex-grow focus:outline-none"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </form>
      </div>
    </div>
  );
};

export default Terminal;