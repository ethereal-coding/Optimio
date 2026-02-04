/**
 * Sentry Error Tracking Configuration
 * Only enabled in production to avoid noise during development
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  // Only initialize in production
  if (import.meta.env.DEV || !SENTRY_DSN) {
    console.log('🔧 Sentry disabled (development or missing DSN)');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    // Session Replay
    replaysSessionSampleRate: 0.01, // 1% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of errors
    // Environment
    environment: import.meta.env.VITE_APP_ENV || 'production',
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    // Before sending, sanitize sensitive data
    beforeSend(event) {
      // Remove potentially sensitive information
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });

  console.log('📡 Sentry initialized');
}

export { Sentry };
