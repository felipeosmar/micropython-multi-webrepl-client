import React, { useState, useEffect, useRef } from 'react';

interface TerminalProps {
  lines: string[];
  onCommand: (command: string) => void;
}

const Terminal: React.FC<TerminalProps> = ({ lines, onCommand }) => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const endOfLinesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endOfLinesRef.current?.scrollIntoView();
  }, [lines]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(e.target.value);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCommand(command);
    if (command.trim()) {
      setHistory(prev => [command, ...prev]);
      setHistoryIndex(-1);
    }
    setCommand('');
  };

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
      <form onSubmit={handleFormSubmit} className="flex items-center pt-1">
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
  );
};

export default Terminal;