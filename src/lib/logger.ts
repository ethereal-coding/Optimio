/**
 * Centralized logging system
 * Supports namespaces, log levels, and structured metadata
 * Easy to swap for external services (Sentry, Datadog, etc.)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  namespace: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  error?: Error;
}

export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, meta?: Record<string, unknown>) => void;
}

type LogTransport = (entry: LogEntry) => void;

// Default transport: console output
let globalTransport: LogTransport = (entry) => {
  const { timestamp, namespace, level, message, meta, error } = entry;
  const prefix = `[${timestamp}] [${namespace.toUpperCase()}] [${level.toUpperCase()}]`;
  
  const args: unknown[] = [prefix, message];
  if (meta && Object.keys(meta).length > 0) {
    args.push(meta);
  }
  if (error) {
    args.push(error);
  }

  switch (level) {
    case 'debug':
      // Only log debug in development
      if (isDevelopment()) {
        console.log(...args);
      }
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
};

function isDevelopment(): boolean {
  return (
    typeof process !== 'undefined' && 
    process.env && 
    process.env.NODE_ENV === 'development'
  ) || (
    typeof window !== 'undefined' && 
    window.location && 
    window.location.hostname === 'localhost'
  );
}

/**
 * Set a custom log transport (e.g., for sending to Sentry, Datadog, etc.)
 */
export function setLogTransport(transport: LogTransport): void {
  globalTransport = transport;
}

/**
 * Create a logger instance with a namespace
 */
export function logger(namespace: string): Logger {
  const createLogEntry = (
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
    error?: Error
  ): LogEntry => ({
    timestamp: new Date().toISOString(),
    namespace,
    level,
    message,
    meta,
    error,
  });

  return {
    debug: (message, meta) => {
      globalTransport(createLogEntry('debug', message, meta));
    },
    info: (message, meta) => {
      globalTransport(createLogEntry('info', message, meta));
    },
    warn: (message, meta) => {
      globalTransport(createLogEntry('warn', message, meta));
    },
    error: (message, error, meta) => {
      globalTransport(createLogEntry('error', message, meta, error));
    },
  };
}

// Default export for convenience
export default logger;
