# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm install` - Install project dependencies
- `npm run dev` - Start development server (runs on http://localhost:5173)
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally

## Project Architecture

This is a React + TypeScript + Vite application that creates a web-based client for managing multiple MicroPython WebREPL and Serial connections simultaneously.

### Core Architecture

**Main Components:**
- `App.tsx` - Main application wrapper with header and styling
- `ReplManager.tsx` - Central component managing all connections and UI state
- `ReplConnectionCard.tsx` - Individual connection cards with terminals
- `AddConnectionForm.tsx` - Form for creating new connections
- `Terminal.tsx` - Terminal component for REPL interaction

**Connection Management:**
- `useWebRepl.ts` - WebSocket-based WebREPL connection hook
- `useSerial.ts` - Web Serial API connection hook  
- Both hooks manage connection lifecycle, data streaming, and status tracking

**Data Flow:**
- Connection configurations stored in browser localStorage
- Each connection maintains independent state (status, terminal history)
- Real-time communication through WebSocket (WebREPL) or Web Serial API
- Terminal output sanitized and streamed to UI components

### Key Features

- **Multi-protocol support**: WebREPL (WebSocket) and Serial (Web Serial API)
- **Persistent configuration**: Connection settings saved locally
- **Real-time terminals**: Interactive REPL sessions with command history
- **Auto-authentication**: Stored passwords for automatic login
- **Responsive UI**: TailwindCSS-styled interface

### Technical Stack

- **Frontend**: React 19, TypeScript 5.7, Vite 6.2
- **Styling**: TailwindCSS (utility classes in JSX)
- **APIs**: WebSocket API, Web Serial API
- **Build**: Vite with TypeScript configuration
- **Types**: Custom types in `types.ts` for connection management

### Environment Configuration

The Vite config includes environment variable handling for `GEMINI_API_KEY`, suggesting integration with Google's Gemini API (though not actively used in current codebase).