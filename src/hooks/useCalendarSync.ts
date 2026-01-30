/**
 * Custom hook for managing Google Calendar sync
 * Handles automatic background sync, retry logic, and state updates
 */

import { useEffect, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { syncAllEvents } from '@/lib/event-sync';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { useAppState } from './useAppState';

const log = logger('useCalendarSync');

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
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
}

/**
 * Hook for managing Google Calendar synchronization
 * 
 * Features:
 * - Automatic background sync with configurable interval
 * - Exponential backoff retry on failure
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
    interval = 10000,
    enabled = true,
    maxRetries = 3,
  } = options;

  const { dispatch, actions } = useAppState();
  const queryClient = useQueryClient();
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Main sync query with automatic background refetch
  const {
    data: syncResult,
    error: syncError,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['calendarSync'],
    queryFn: async () => {
      log.info('Starting sync');
      const startTime = Date.now();
      
      try {
        const result = await syncAllEvents();
        const duration = Date.now() - startTime;
        
        log.info('Sync completed', {
          durationMs: duration,
          added: result.added,
          updated: result.updated,
          removed: result.removed,
          errorCount: result.errors.length,
        });

        setLastSyncTime(new Date().toISOString());
        return result;
      } catch (error) {
        log.error('Sync failed', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    },
    refetchInterval: enabled ? interval : false,
    retry: maxRetries,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
    staleTime: interval / 2, // Consider data stale halfway through interval
  });

  // Update local state when sync completes successfully
  useEffect(() => {
    if (!syncResult) return;

    const updateState = async () => {
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
        
        log.info('State updated after sync', { eventCount: hydratedEvents.length });
      } catch (error) {
        log.error('Failed to update state after sync', error instanceof Error ? error : new Error(String(error)));
      }
    };

    updateState();
  }, [syncResult, dispatch, actions]);

  // Manual sync trigger
  const manualSync = useCallback(async () => {
    log.info('Manual sync triggered');
    await refetch();
  }, [refetch]);

  // Retry failed sync
  const retry = useCallback(async () => {
    log.info('Retrying sync');
    await queryClient.invalidateQueries({ queryKey: ['calendarSync'] });
    await refetch();
  }, [queryClient, refetch]);

  return {
    lastSync: syncResult ?? null,
    isPending,
    isError,
    error: syncError instanceof Error ? syncError : syncError ? new Error(String(syncError)) : null,
    lastSyncTime,
    manualSync,
    retry,
  };
}

export default useCalendarSync;
