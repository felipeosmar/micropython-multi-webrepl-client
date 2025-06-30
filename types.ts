export type ReplConnection = {
  id: string;
  name: string;
  connectionType: 'webrepl' | 'serial';
  ip: string;
  password?: string;
  port?: any; // O objeto da porta serial não é serializável
};

export type TerminalData = {
  // ...existing fields...
};

export enum ReplStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  PASSWORD = 'password',
}