import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// lib/utils/logger.ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private static log(level: LogLevel, message: string, ...args: any[]) {
    if (process.env.NODE_ENV !== 'production' || level === 'error') {
      console[level](`[${level.toUpperCase()}] ${message}`, ...args);
    }
  }

  static debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  static info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  static warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  static error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}
