import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { ReplConnection } from '../types';
import { DebouncedStorage } from '../../../shared/utils';

export interface ConnectionState {
  connections: ReplConnection[];
  isLoading: boolean;
  error: string | null;
}

export type ConnectionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTIONS'; payload: ReplConnection[] }
  | { type: 'ADD_CONNECTION'; payload: ReplConnection }
  | { type: 'UPDATE_CONNECTION'; payload: { id: string; connection: Partial<ReplConnection> } }
  | { type: 'REMOVE_CONNECTION'; payload: string };

const initialState: ConnectionState = {
  connections: [],
  isLoading: false,
  error: null,
};

function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_CONNECTIONS':
      return { ...state, connections: action.payload, isLoading: false };
    
    case 'ADD_CONNECTION':
      return {
        ...state,
        connections: [...state.connections, action.payload],
        error: null,
      };
    
    case 'UPDATE_CONNECTION':
      return {
        ...state,
        connections: state.connections.map(conn =>
          conn.id === action.payload.id
            ? { ...conn, ...action.payload.connection }
            : conn
        ),
        error: null,
      };
    
    case 'REMOVE_CONNECTION':
      return {
        ...state,
        connections: state.connections.filter(conn => conn.id !== action.payload),
        error: null,
      };
    
    default:
      return state;
  }
}

interface ConnectionContextValue {
  state: ConnectionState;
  actions: {
    addConnection: (connection: Omit<ReplConnection, 'id'>) => void;
    updateConnection: (id: string, connection: Partial<ReplConnection>) => void;
    removeConnection: (id: string) => void;
    loadConnections: () => Promise<void>;
  };
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function useConnections() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnections must be used within a ConnectionProvider');
  }
  return context;
}

interface ConnectionProviderProps {
  children: ReactNode;
}

export function ConnectionProvider({ children }: ConnectionProviderProps) {
  const [state, dispatch] = useReducer(connectionReducer, initialState);

  const loadConnections = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const savedConnections = DebouncedStorage.getItem('webrepl-connections');
      if (!savedConnections) {
        dispatch({ type: 'SET_CONNECTIONS', payload: [] });
        return;
      }

      const parsed = Array.isArray(savedConnections) ? savedConnections : [];
      
      // Para conexões seriais, tenta reestabelecer a porta
      const connectionsWithPorts = await Promise.all(
        parsed.map(async (conn: any) => {
          if (conn.connectionType === 'serial' && conn.portInfo) {
            try {
              const ports = await navigator.serial.getPorts();
              const matchingPort = ports.find(port => {
                const info = port.getInfo();
                return info.usbVendorId === conn.portInfo.vendorId && 
                       info.usbProductId === conn.portInfo.productId;
              });
              return { ...conn, port: matchingPort || null };
            } catch {
              return { ...conn, port: null };
            }
          }
          return conn;
        })
      );
      
      dispatch({ type: 'SET_CONNECTIONS', payload: connectionsWithPorts });
    } catch (error) {
      console.error("Failed to load connections from localStorage", error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load saved connections' });
      dispatch({ type: 'SET_CONNECTIONS', payload: [] });
    }
  }, []);

  const addConnection = useCallback((connection: Omit<ReplConnection, 'id'>) => {
    const newConnection: ReplConnection = {
      id: `repl-${Date.now()}`,
      ...connection,
    };
    dispatch({ type: 'ADD_CONNECTION', payload: newConnection });
  }, []);

  const updateConnection = useCallback((id: string, connection: Partial<ReplConnection>) => {
    dispatch({ type: 'UPDATE_CONNECTION', payload: { id, connection } });
  }, []);

  const removeConnection = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_CONNECTION', payload: id });
  }, []);

  // Salva conexões no localStorage sempre que o estado muda
  useEffect(() => {
    if (state.connections.length === 0 && state.isLoading) return;

    try {
      // Remove o objeto 'port' antes de salvar, pois ele não é serializável
      const connectionsToSave = state.connections.map(({ port, ...rest }) => ({
        ...rest,
        // Salva informações da porta para tentar reconectar
        portInfo: port ? {
          vendorId: port.getInfo().usbVendorId,
          productId: port.getInfo().usbProductId
        } : rest.portInfo
      }));
      
      DebouncedStorage.setItem('webrepl-connections', connectionsToSave);
    } catch (error) {
      console.error("Failed to save connections to localStorage", error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save connections' });
    }
  }, [state.connections, state.isLoading]);

  const contextValue: ConnectionContextValue = useMemo(() => ({
    state,
    actions: {
      addConnection,
      updateConnection,
      removeConnection,
      loadConnections,
    },
  }), [state, addConnection, updateConnection, removeConnection, loadConnections]);

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
}