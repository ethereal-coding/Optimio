/**
 * Privacy-respecting analytics
 * Track usage without being creepy
 */

import { logger } from './logger';

const log = logger('analytics');

// =============================================================================
// Configuration
// =============================================================================

interface AnalyticsConfig {
  enabled: boolean;
  endpoint?: string;
  debug?: boolean;
}

const config: AnalyticsConfig = {
  enabled: import.meta.env.PROD, // Only in production
  endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT,
  debug: import.meta.env.DEV,
};

// =============================================================================
// Types
// =============================================================================

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  userAgent?: string;
  url?: string;
}

// =============================================================================
// Session Management
// =============================================================================

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

// =============================================================================
// Event Queue
// =============================================================================

const eventQueue: AnalyticsEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

function queueEvent(event: AnalyticsEvent): void {
  if (!config.enabled && !config.debug) return;
  
  eventQueue.push(event);
  
  // Debounce flushes
  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }
  
  flushTimeout = setTimeout(() => {
    flushEvents();
  }, 5000); // Flush every 5 seconds
}

async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;
  
  const events = [...eventQueue];
  eventQueue.length = 0; // Clear queue
  
  if (config.debug) {
    log.debug('Analytics events', { events });
    return;
  }
  
  if (!config.endpoint) return;
  
  try {
    await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true, // Continue even if page unloads
    });
  } catch (error) {
    // Silent fail - analytics should never break the app
    log.debug('Failed to send analytics', { error });
  }
}

// =============================================================================
// Core Tracking Function
// =============================================================================

function track(eventName: string, properties?: Record<string, unknown>): void {
  const event: AnalyticsEvent = {
    name: eventName,
    properties,
    timestamp: Date.now(),
    sessionId: getSessionId(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  
  queueEvent(event);
}

// =============================================================================
// Specific Event Trackers
// =============================================================================

export const analytics = {
  // Generic track
  track,
  
  // Page views
  pageView: (pageName: string) => {
    track('page_view', { page: pageName });
  },
  
  // Calendar events
  eventCreated: (properties?: { calendarId?: string; hasDescription?: boolean }) => {
    track('event_created', properties);
  },
  
  eventUpdated: (properties?: { calendarId?: string }) => {
    track('event_updated', properties);
  },
  
  eventDeleted: (properties?: { calendarId?: string }) => {
    track('event_deleted', properties);
  },
  
  // Sync events
  syncStarted: () => {
    track('sync_started');
  },
  
  syncCompleted: (properties: { duration: number; added: number; updated: number; removed: number }) => {
    track('sync_completed', properties);
  },
  
  syncFailed: (properties: { error: string; duration: number }) => {
    track('sync_failed', properties);
  },
  
  // Todo events
  todoCreated: (properties?: { priority?: string }) => {
    track('todo_created', properties);
  },
  
  todoCompleted: () => {
    track('todo_completed');
  },
  
  // Goal events
  goalCreated: () => {
    track('goal_created');
  },
  
  goalUpdated: () => {
    track('goal_updated');
  },
  
  // Note events
  noteCreated: () => {
    track('note_created');
  },
  
  // Auth events
  authSuccess: (provider: string) => {
    track('auth_success', { provider });
  },
  
  authError: (properties: { provider: string; reason: string }) => {
    track('auth_error', properties);
  },
  
  // Settings
  settingsChanged: (properties: { setting: string; value: unknown }) => {
    track('settings_changed', properties);
  },
  
  // Search
  search: (properties: { query: string; resultsCount: number }) => {
    track('search', properties);
  },
  
  // Flush manually (call on page unload)
  flush: flushEvents,
};

// =============================================================================
// Auto-track page views
// =============================================================================

if (typeof window !== 'undefined') {
  // Track initial page view
  analytics.pageView(window.location.pathname);
  
  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    analytics.flush();
  });
}

export default analytics;
