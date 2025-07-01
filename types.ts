export enum ReplStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  PASSWORD = 'password',
  ERROR = 'error',
}

/**
 * Representa uma única configuração de conexão REPL.
 * O objeto `port` não é persistido e precisa ser readquirido a cada sessão.
 */
export interface ReplConnection {
  id: string;
  name: string;
  connectionType: 'webrepl' | 'serial';
  ip?: string;
  password?: string;
  port?: SerialPort | null;
  baudRate?: number;
  portInfo?: {
    vendorId?: number;
    productId?: number;
  } | null;
}