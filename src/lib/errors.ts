/**
 * Error handling utilities
 * Provides consistent error handling patterns across the app
 */

import { debug } from './debug';

export class AppError extends Error {
  code: string;
  recoverable: boolean;
  
  constructor(
    message: string,
    code: string,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR', true);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', true);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', true);
    this.name = 'ValidationError';
  }
}

export class SyncError extends AppError {
  constructor(message: string, recoverable: boolean = true) {
    super(message, 'SYNC_ERROR', recoverable);
    this.name = 'SyncError';
  }
}

/**
 * Wraps an async function with consistent error handling
 * Logs errors and optionally rethrows them
 */
export async function handleAsync<T>(
  fn: () => Promise<T>,
  context: string,
  options: {
    rethrow?: boolean;
    fallback?: T;
  } = {}
): Promise<T | undefined> {
  const { rethrow = false, fallback } = options;

  try {
    return await fn();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    debug.error(`[${context}]`, errorMessage, error);

    if (rethrow) {
      throw error;
    }

    return fallback;
  }
}

/**
 * Checks if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.recoverable;
  }

  // Network errors are typically recoverable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

/**
 * Formats an error for display to users
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Don't expose technical details to users
    if (error.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
