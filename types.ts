/**
 * Estados possíveis de uma conexão REPL
 * - CONNECTING: Tentando estabelecer conexão
 * - CONNECTED: Conexão ativa e funcionando
 * - DISCONNECTED: Sem conexão
 * - PASSWORD: Aguardando senha para WebREPL
 * - ERROR: Erro na conexão
 */
export enum ReplStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  PASSWORD = 'password',
  ERROR = 'error',
}

/**
 * Interface que representa uma configuração de conexão REPL.
 * Suporta tanto WebREPL (WebSocket) quanto Serial (Web Serial API).
 * 
 * Nota: O objeto `port` não é persistido no localStorage e precisa ser
 * readquirido a cada sessão através do `portInfo`.
 */
export interface ReplConnection {
  /** Identificador único da conexão */
  id: string;
  /** Nome descritivo da conexão (ex: "ESP32 da Sala") */
  name: string;
  /** Tipo de conexão: WebREPL ou Serial */
  connectionType: 'webrepl' | 'serial';
  /** Endereço IP para conexões WebREPL (ex: "192.168.4.1") */
  ip?: string;
  /** Senha para autenticação automática no WebREPL */
  password?: string;
  /** Referência à porta serial (não persistida) */
  port?: SerialPort | null;
  /** Taxa de transmissão para conexões seriais (padrão: 115200) */
  baudRate?: number;
  /** Informações da porta serial para reconexão */
  portInfo?: {
    vendorId?: number;
    productId?: number;
  } | null;
  /** Tipo de terminador de linha para comandos seriais */
  lineEnding?: 'none' | 'newline' | 'carriageReturn' | 'both';
  /** Se deve rolar automaticamente o terminal */
  autoScroll?: boolean;
  /** Se deve exibir timestamp nas mensagens */
  showTimestamp?: boolean;
}