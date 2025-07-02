/**
 * Debounce utility function
 * Delays the execution of a function until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle utility function
 * Ensures a function is called at most once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastTime >= wait) {
      lastTime = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastTime = Date.now();
        timeout = null;
        func(...args);
      }, wait - (now - lastTime));
    }
  };
}

/**
 * Custom hook for debounced values
 */
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced localStorage operations
 */
export class DebouncedStorage {
  private static saveQueue = new Map<string, any>();
  private static saveTimeout: NodeJS.Timeout | null = null;
  private static readonly SAVE_DELAY = 500; // 500ms delay

  static setItem(key: string, value: any): void {
    this.saveQueue.set(key, value);
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.flushQueue();
    }, this.SAVE_DELAY);
  }

  static getItem(key: string): any {
    // Check queue first for latest value
    if (this.saveQueue.has(key)) {
      return this.saveQueue.get(key);
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  }

  static removeItem(key: string): void {
    this.saveQueue.delete(key);
    localStorage.removeItem(key);
  }

  static flushQueue(): void {
    for (const [key, value] of this.saveQueue.entries()) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
      }
    }
    this.saveQueue.clear();
    this.saveTimeout = null;
  }

  static clear(): void {
    this.saveQueue.clear();
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    localStorage.clear();
  }
}