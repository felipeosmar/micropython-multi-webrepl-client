/**
 * Application constants
 */

// Connection defaults
export const DEFAULT_BAUD_RATE = 115200;
export const DEFAULT_LINE_ENDING = 'carriageReturn';
export const DEFAULT_WEBREPL_PORT = 8266;

// WebSocket retry configuration
export const MAX_RETRY_ATTEMPTS = 3;
export const INITIAL_RETRY_DELAY = 1000; // 1 second
export const MAX_RETRY_DELAY = 10000; // 10 seconds

// LocalStorage keys
export const STORAGE_KEYS = {
  CONNECTIONS: 'webrepl-connections',
} as const;

// Debounce delays
export const DEBOUNCE_DELAYS = {
  STORAGE: 500, // milliseconds
  SEARCH: 300,
  RESIZE: 250,
} as const;

// File operation timeouts
export const TIMEOUTS = {
  CONNECTION: 10000, // 10 seconds
  FILE_UPLOAD: 30000, // 30 seconds
  FILE_DOWNLOAD: 30000, // 30 seconds
} as const;