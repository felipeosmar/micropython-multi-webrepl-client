import { ReplConnection, ReplStatus } from '../types';

export interface ConnectionHandler {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendCommand(command: string): void;
  getStatus(): ReplStatus;
  getLines(): string[];
  clearOutput(): void;
}

export class ConnectionService {
  private static instance: ConnectionService;
  private connections = new Map<string, ConnectionHandler>();

  private constructor() {}

  static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    return ConnectionService.instance;
  }

  registerConnection(id: string, handler: ConnectionHandler): void {
    this.connections.set(id, handler);
  }

  unregisterConnection(id: string): void {
    this.connections.delete(id);
  }

  getConnection(id: string): ConnectionHandler | undefined {
    return this.connections.get(id);
  }

  async connectToDevice(id: string): Promise<void> {
    const handler = this.connections.get(id);
    if (!handler) {
      throw new Error(`Connection handler not found for ID: ${id}`);
    }
    await handler.connect();
  }

  async disconnectFromDevice(id: string): Promise<void> {
    const handler = this.connections.get(id);
    if (!handler) {
      throw new Error(`Connection handler not found for ID: ${id}`);
    }
    await handler.disconnect();
  }

  sendCommand(id: string, command: string): void {
    const handler = this.connections.get(id);
    if (!handler) {
      throw new Error(`Connection handler not found for ID: ${id}`);
    }
    handler.sendCommand(command);
  }

  getConnectionStatus(id: string): ReplStatus {
    const handler = this.connections.get(id);
    if (!handler) {
      return ReplStatus.DISCONNECTED;
    }
    return handler.getStatus();
  }

  validateConnection(connection: Partial<ReplConnection>): string[] {
    const errors: string[] = [];

    if (!connection.name?.trim()) {
      errors.push('Connection name is required');
    }

    if (!connection.connectionType) {
      errors.push('Connection type is required');
    }

    if (connection.connectionType === 'webrepl') {
      if (!connection.ip?.trim()) {
        errors.push('IP address is required for WebREPL connections');
      } else if (!this.isValidIP(connection.ip)) {
        errors.push('Please enter a valid IP address');
      }
    }

    if (connection.connectionType === 'serial') {
      if (!connection.port) {
        errors.push('Serial port selection is required');
      }
      if (connection.baudRate && connection.baudRate <= 0) {
        errors.push('Baud rate must be a positive number');
      }
    }

    return errors;
  }

  private isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  createWebSocketURL(ip: string): string {
    // Ensure proper WebSocket URL format
    if (ip.startsWith('ws://') || ip.startsWith('wss://')) {
      return ip;
    }
    return `ws://${ip}:8266`;
  }

  async checkSerialSupport(): Promise<boolean> {
    return 'serial' in navigator;
  }

  async requestSerialPort(): Promise<SerialPort | null> {
    try {
      if (!await this.checkSerialSupport()) {
        throw new Error('Web Serial API not supported in this browser');
      }
      return await navigator.serial.requestPort();
    } catch (error) {
      console.error('Failed to request serial port:', error);
      return null;
    }
  }

  async getAvailableSerialPorts(): Promise<SerialPort[]> {
    try {
      if (!await this.checkSerialSupport()) {
        return [];
      }
      return await navigator.serial.getPorts();
    } catch (error) {
      console.error('Failed to get serial ports:', error);
      return [];
    }
  }

  generateConnectionId(): string {
    return `repl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  formatPortInfo(port: SerialPort): string {
    const info = port.getInfo();
    return `USB Device (${info.usbVendorId}:${info.usbProductId})`;
  }
}