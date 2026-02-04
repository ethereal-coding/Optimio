/**
 * Custom hook for managing Google Calendar sync
 * Handles automatic background sync every 10 seconds while authenticated
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { syncAllEvents } from '@/lib/event-sync';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { useAppState, actions } from './useAppState';
import { isAuthenticated, validateAuthEvent } from '@/lib/google-auth';

const log = logger('useCalendarSync');

// Sync interval: 10 seconds
const SYNC_INTERVAL = 10000;

// Global pending sync promise for deduplication across hook instances
let pendingSyncPromise: Promise<boolean> | null = null;

export interface SyncStatus {
  /** Last successful sync result */
  lastSync: {
    added: number;
    updated: number;
    removed: number;
    errors: string[];
  } | null;
  /** Whether sync is currently in progress */
  isPending: boolean;
  /** Whether the last sync failed */
  isError: boolean;
  /** Error from last failed sync */
  error: Error | null;
  /** ISO timestamp of last successful sync */
  lastSyncTime: string | null;
}

export interface UseCalendarSyncReturn extends SyncStatus {
  /** Manually trigger a sync */
  manualSync: () => Promise<void>;
  /** Retry the last failed sync */
  retry: () => Promise<void>;
}

interface UseCalendarSyncOptions {
  /** Sync interval in milliseconds (default: 10000 = 10 seconds) */
  interval?: number;
  /** Whether to enable automatic background sync (default: true) */
  enabled?: boolean;
}

/**
 * Hook for managing Google Calendar synchronization
 * 
 * Features:
 * - Automatic background sync every 10 seconds while authenticated
 * - Graceful handling of auth failures (stops syncing until re-authenticated)
 * - Manual sync trigger
 * - Automatic state updates after sync
 * - Comprehensive error handling
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { isPending, isError, manualSync } = useCalendarSync({ interval: 10000 });
 *   
 *   return (
 *     <div>
 *       {isPending && <span>Syncing...</span>}
 *       {isError && <button onClick={manualSync}>Retry</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCalendarSync(options: UseCalendarSyncOptions = {}): UseCalendarSyncReturn {
  const {
    interval = SYNC_INTERVAL,
    enabled = true,
  } = options;

  const { dispatch } = useAppState();
  
  // Auth state
  const [isAuth, setIsAuth] = useState(false);
  
  // Sync state
  const [syncState, setSyncState] = useState<SyncStatus>({
    lastSync: null,
    isPending: false,
    isError: false,
    error: null,
    lastSyncTime: null,
  });

  // Track if component is mounted
  const isMountedRef = useRef(true);
  
  // Track last sync time to prevent duplicate syncs
  const lastSyncRef = useRef<number>(0);

  // Check auth status - only on mount and when auth events fire
  // No polling - we trust the auth state events
  useEffect(() => {
    isMountedRef.current = true;

    const checkAuth = async () => {
      const auth = await isAuthenticated();
      if (isMountedRef.current) {
        setIsAuth(auth);
      }
    };

    // Initial check only
    checkAuth();

    // Listen for auth state changes (no polling needed, with CSRF protection)
    const handleAuthChange = (event: CustomEvent) => {
      // Validate the event token to prevent spoofing
      if (!validateAuthEvent(event.detail)) {
        log.warn('Ignoring spoofed auth-state-changed event');
        return;
      }
      if (isMountedRef.current) {
        setIsAuth(event.detail.isAuthenticated);
      }
    };

    window.addEventListener('auth-state-changed', handleAuthChange as EventListener);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('auth-state-changed', handleAuthChange as EventListener);
    };
  }, []);

  // Perform sync
  const performSync = useCallback(async (): Promise<boolean> => {
    // Return existing promise if sync is already in progress (global deduplication)
    if (pendingSyncPromise) {
      log.debug('Sync already in progress, returning existing promise');
      return pendingSyncPromise;
    }

    // Create the sync promise
    const syncPromise = (async (): Promise<boolean> => {
      // Check auth before syncing
      const auth = await isAuthenticated();
      if (!auth) {
        log.debug('Not authenticated, skipping sync');
        setIsAuth(false);
        return false;
      }

      // Update state to pending
      setSyncState(prev => ({ ...prev, isPending: true, isError: false, error: null }));

      const startTime = Date.now();
      
      try {
        log.info('Starting calendar sync');
        const result = await syncAllEvents();
        const duration = Date.now() - startTime;
        
        log.info('Sync completed', {
          durationMs: duration,
          added: result.added,
          updated: result.updated,
          removed: result.removed,
          errorCount: result.errors.length,
        });

        // Update sync state
        const newSyncState: SyncStatus = {
          lastSync: result,
          isPending: false,
          isError: result.errors.length > 0 && result.added === 0 && result.updated === 0 && result.removed === 0,
          error: result.errors.length > 0 ? new Error(result.errors.join(', ')) : null,
          lastSyncTime: new Date().toISOString(),
        };

        if (isMountedRef.current) {
          setSyncState(newSyncState);
          lastSyncRef.current = Date.now();
        }

        // Update local state with synced events
        await updateLocalState(dispatch);

        return true;
      } catch (error) {
        const duration = Date.now() - startTime;
        log.error('Sync failed', error instanceof Error ? error : new Error(String(error)), { duration });

        if (isMountedRef.current) {
          setSyncState(prev => ({
            ...prev,
            isPending: false,
            isError: true,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }

        return false;
      }
    })();

    // Store the promise globally for deduplication
    pendingSyncPromise = syncPromise;

    try {
      return await syncPromise;
    } finally {
      // Clear the global promise when sync completes (success or error)
      pendingSyncPromise = null;
    }
  }, [dispatch]);

  // Automatic background sync every 10 seconds when authenticated
  useEffect(() => {
    if (!enabled || !isAuth) return;

    // Perform initial sync
    performSync();

    // Set up 10-second interval
    const syncInterval = setInterval(() => {
      // Only sync if enough time has passed since last sync
      const timeSinceLastSync = Date.now() - lastSyncRef.current;
      if (timeSinceLastSync >= interval - 1000) { // Allow 1 second buffer
        performSync();
      }
    }, interval);

    return () => {
      clearInterval(syncInterval);
    };
  }, [enabled, isAuth, interval, performSync]);

  // Manual sync trigger
  const manualSync = useCallback(async () => {
    log.info('Manual sync triggered');
    await performSync();
  }, [performSync]);

  // Retry failed sync
  const retry = useCallback(async () => {
    log.info('Retrying sync');
    await performSync();
  }, [performSync]);

  return {
    ...syncState,
    manualSync,
    retry,
  };
}

/**
 * Update local state with synced events from database
 */
async function updateLocalState(dispatch: ReturnType<typeof useAppState>['dispatch']): Promise<void> {
  try {
    // Reload all events from DB to ensure consistency
    const enabledCalendars = await db.calendars
      .where('enabled')
      .equals(1)
      .toArray();
    
    const enabledCalendarIds = new Set(enabledCalendars.map(c => c.id));
    const events = await db.events.toArray();

    // Hydrate dates and filter by enabled calendars
    const hydratedEvents = events
      .filter(event => !event.sourceCalendarId || enabledCalendarIds.has(event.sourceCalendarId))
      .map(event => ({
        ...event,
        startTime: event.startTime instanceof Date ? event.startTime : new Date(event.startTime),
        endTime: event.endTime instanceof Date ? event.endTime : new Date(event.endTime),
      }));

    // Replace all events atomically
    dispatch(actions.setEvents('1', hydratedEvents));
    
    log.info('Local state updated after sync', { eventCount: hydratedEvents.length });
  } catch (error) {
    log.error('Failed to update local state after sync', error instanceof Error ? error : new Error(String(error)));
  }
}

export default useCalendarSync;
