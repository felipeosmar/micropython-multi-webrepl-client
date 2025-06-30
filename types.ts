export type ReplConnection = {
  id: string;
  name: string;
  ip: string;
  connectionType: 'webrepl' | 'serial';
  password?: string;
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