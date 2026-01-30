/**
 * Debug logging utility
 * Set DEBUG=true in localStorage to enable debug logging
 */

const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('DEBUG') === 'true';
  } catch {
    return false;
  }
};

export const debug = {
  log: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.log('[DEBUG]', ...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.warn('[DEBUG]', ...args);
    }
  },

  error: (...args: any[]) => {
    // Always log errors
    console.error('[ERROR]', ...args);
  },

  info: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.info('[INFO]', ...args);
    }
  }
};

// Export helper to enable/disable debug mode
export const setDebugMode = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    if (enabled) {
      localStorage.setItem('DEBUG', 'true');
      console.log('Debug mode enabled. Reload the page to see debug logs.');
    } else {
      localStorage.removeItem('DEBUG');
      console.log('Debug mode disabled.');
    }
  }
};
