import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  syncGoogleCalendar,
  fetchGoogleCalendarChanges,
  expandRecurringEvent,
  convertGoogleEventToAppEvent,
  type GoogleCalendarEvent
} from './google-calendar';
import { isAuthenticated } from './google-auth';
import { db } from './db';
import type { CalendarEvent } from '@/types';
import { debug } from './debug';

/**
 * Calendar Sync Helpers
 * Wraps calendar actions with Google Calendar sync
 */

/**
 * Add event with Google Calendar sync
 */
export async function addEventWithSync(
  calendarId: string,
  event: CalendarEvent,
  dispatch: (action: any) => void,
  actions: any
): Promise<CalendarEvent> {
  // Create local copy with temporary ID if needed
  const localEvent = { ...event };

  // Add to local state immediately
  dispatch(actions.addEvent(calendarId, localEvent));

  // Try to sync with Google Calendar if signed in
  if (await isAuthenticated()) {
    try {
      // Always use 'primary' for Google Calendar API
      const googleEvent = await createGoogleCalendarEvent(event, 'primary');

      // Update local event with Google ID
      const syncedEvent: CalendarEvent = {
        ...localEvent,
        googleEventId: googleEvent.id,
        syncedFromGoogle: true
      };

      // Update in local state with Google ID
      dispatch(actions.updateEvent(calendarId, syncedEvent));

      debug.log('✅ Event created in Google Calendar:', googleEvent.id);
      return syncedEvent;
    } catch (error) {
      console.error('Failed to sync event to Google Calendar:', error);
      // Event is still saved locally even if Google sync fails
    }
  }

  return localEvent;
}

/**
 * Update event with Google Calendar sync
 */
export async function updateEventWithSync(
  calendarId: string,
  event: CalendarEvent,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Update local state immediately
  dispatch(actions.updateEvent(calendarId, event));

  // Sync with Google Calendar if this event was synced
  if (event.googleEventId && await isAuthenticated()) {
    try {
      await updateGoogleCalendarEvent(event.googleEventId, event, calendarId);
      debug.log('✅ Event updated in Google Calendar:', event.googleEventId);
    } catch (error) {
      console.error('Failed to update event in Google Calendar:', error);
      // Local update still succeeds even if Google sync fails
    }
  }
}

/**
 * Delete event with Google Calendar sync
 */
export async function deleteEventWithSync(
  calendarId: string,
  eventId: string,
  event: CalendarEvent | undefined,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Delete from local state immediately
  dispatch(actions.deleteEvent(calendarId, eventId));

  // Delete from Google Calendar if this event was synced
  if (event?.googleEventId && await isAuthenticated()) {
    try {
      await deleteGoogleCalendarEvent(event.googleEventId, calendarId);
      debug.log('✅ Event deleted from Google Calendar:', event.googleEventId);
    } catch (error) {
      console.error('Failed to delete event from Google Calendar:', error);
      // Local deletion still succeeds even if Google sync fails
    }
  }
}

/**
 * Process a single event instance (helper function)
 */
async function processEventInstance(
  googleEvent: GoogleCalendarEvent,
  localCalendarId: string,
  dispatch: (action: any) => void,
  actions: any,
  sourceCalendarId?: string // Add source calendar ID parameter
): Promise<'added' | 'updated' | 'skipped'> {
  try {
    // Check if event already exists in IndexedDB from THIS calendar
    let existingEvent = await db.events
      .where('googleEventId')
      .equals(googleEvent.id)
      .filter(e => !sourceCalendarId || e.sourceCalendarId === sourceCalendarId)
      .first();

    const appEvent = convertGoogleEventToAppEvent(googleEvent, localCalendarId);

    if (existingEvent) {
      // Update existing event
      // Check etag to detect if event actually changed
      if (existingEvent.etag === googleEvent.etag) {
        // No changes, skip
        return 'skipped';
      }

      // Update in IndexedDB
      await db.events.update(existingEvent.id, {
        ...appEvent,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
        etag: googleEvent.etag,
        sourceCalendarId: sourceCalendarId
      });

      // Update in state
      dispatch(actions.updateEvent(localCalendarId, {
        ...appEvent,
        id: existingEvent.id, // Keep local ID
        sourceCalendarId: sourceCalendarId
      }));

      return 'updated';
    } else {
      // Add new event
      const newEvent = {
        ...appEvent,
        syncStatus: 'synced' as const,
        lastSyncedAt: new Date().toISOString(),
        etag: googleEvent.etag,
        sourceCalendarId: sourceCalendarId // Tag with source calendar
      };

      // Add to IndexedDB
      await db.events.add(newEvent);

      // Add to state
      dispatch(actions.addEvent(localCalendarId, newEvent));

      return 'added';
    }
  } catch (error) {
    console.error('Failed to process event instance:', error);
    return 'skipped';
  }
}

/**
 * Sync Google Calendar events to local state using incremental sync
 * Now supports syncing from multiple enabled calendars
 * Call this on app load or periodically
 */
export async function syncFromGoogleCalendar(
  localCalendarId: string,
  dispatch: (action: any) => void,
  actions: any,
  options?: {
    forceFullSync?: boolean;
  }
): Promise<CalendarEvent[]> {
  if (!await isAuthenticated()) {
    debug.log('Not authenticated, skipping Google Calendar sync');
    return [];
  }

  try {
    // Get all enabled calendars
    const enabledCalendars = await db.calendarPreferences.where('enabled').equals(true).toArray();

    if (enabledCalendars.length === 0) {
      debug.log('⚠️ No enabled calendars found, syncing from primary only');
      enabledCalendars.push({
        id: 'primary',
        summary: 'Primary Calendar',
        enabled: true,
        color: '#3b82f6',
        primary: true
      });
    }

    debug.log(`🔄 Syncing ${enabledCalendars.length} calendar(s)...`);

    let totalAdded = 0;
    let totalUpdated = 0;
    let totalDeleted = 0;

    // Sync each enabled calendar
    for (const calendar of enabledCalendars) {
      debug.log(`📅 Syncing calendar: ${calendar.summary} (${calendar.id})`);

      // Get sync metadata for this calendar
      const syncMetaId = `google-calendar-${calendar.id}`;
      let syncMeta = await db.syncMetadata.get(syncMetaId);

      // Initialize metadata if not exists
      if (!syncMeta) {
        syncMeta = {
          id: syncMetaId,
          calendarId: calendar.id,
          lastSyncTime: 0,
          syncToken: null,
          pageToken: null,
          status: 'idle',
          lastError: null,
          fullSyncCompletedAt: null,
          eventsCount: 0
        };
        await db.syncMetadata.add(syncMeta);
      }

      // Check if already syncing (prevent race conditions)
      const now = Date.now();
      const SYNC_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

      if (syncMeta.status === 'syncing') {
        const timeSinceLastSync = now - syncMeta.lastSyncTime;
        if (timeSinceLastSync < SYNC_TIMEOUT_MS) {
          debug.log('⏭️ Sync already in progress, skipping this calendar');
          continue;
        } else {
          debug.warn('⚠️ Sync lock timeout detected, forcing release');
        }
      }

      // Set status to syncing
      await db.syncMetadata.update(syncMetaId, {
        status: 'syncing',
        lastSyncTime: now,
        lastError: null
      });

      // Determine sync token
      const syncToken = options?.forceFullSync ? null : syncMeta.syncToken;

      try {
        // Fetch changes from Google
        const { events: googleEvents, nextSyncToken } = await fetchGoogleCalendarChanges(calendar.id, syncToken);

        debug.log(`📥 Received ${googleEvents.length} changed events from ${calendar.summary}`);

        // Process each changed event
        let addedCount = 0;
        let updatedCount = 0;
        let deletedCount = 0;

        for (const googleEvent of googleEvents) {
          if (googleEvent.status === 'cancelled') {
            // Event deleted - find by googleEventId from THIS calendar
            const existingEvent = await db.events
              .where('googleEventId')
              .equals(googleEvent.id)
              .filter(e => e.sourceCalendarId === calendar.id)
              .first();

            if (existingEvent) {
              await db.events.delete(existingEvent.id);
              dispatch(actions.deleteEvent(localCalendarId, existingEvent.id));
              deletedCount++;
            }
            continue;
          }

          // Check if event is recurring master
          if (googleEvent.recurrence) {
            debug.log('🔁 Expanding recurring event:', googleEvent.summary);
            const now = new Date();
            const twoYearsAhead = new Date(now.getFullYear() + 2, 11, 31);
            const instances = expandRecurringEvent(googleEvent, now, twoYearsAhead);
            debug.log(`  → Generated ${instances.length} instances`);

            for (const instance of instances) {
              const result = await processEventInstance(instance, localCalendarId, dispatch, actions, calendar.id);
              if (result === 'added') addedCount++;
              if (result === 'updated') updatedCount++;
            }
          } else {
            // Single event or recurring instance
            const result = await processEventInstance(googleEvent, localCalendarId, dispatch, actions, calendar.id);
            if (result === 'added') addedCount++;
            if (result === 'updated') updatedCount++;
          }
        }

        // Update sync metadata for this calendar
        const completionTime = Date.now();
        await db.syncMetadata.update(syncMetaId, {
          lastSyncTime: completionTime,
          syncToken: nextSyncToken,
          status: 'idle',
          lastError: null,
          fullSyncCompletedAt: syncToken ? syncMeta.fullSyncCompletedAt : completionTime,
          eventsCount: await db.events.where('sourceCalendarId').equals(calendar.id).count()
        });

        debug.log(`  ✅ ${calendar.summary}: ${addedCount} added, ${updatedCount} updated, ${deletedCount} deleted`);

        totalAdded += addedCount;
        totalUpdated += updatedCount;
        totalDeleted += deletedCount;
      } catch (calendarError) {
        console.error(`Failed to sync calendar ${calendar.summary}:`, calendarError);

        // Update metadata with error
        await db.syncMetadata.update(syncMetaId, {
          status: 'idle',
          lastError: calendarError instanceof Error ? calendarError.message : 'Unknown error'
        });
        // Continue with other calendars
      }
    }

    debug.log(`✅ Multi-calendar sync complete: ${totalAdded} added, ${totalUpdated} updated, ${totalDeleted} deleted`);

    // Return all events from database
    const allEvents = await db.events.toArray();
    return allEvents;
  } catch (error) {
    console.error('Failed to sync from Google Calendar:', error);

    // Update sync metadata with error - ALWAYS reset to idle to prevent permanent lock
    try {
      await db.syncMetadata.update('google-calendar-primary', {
        status: 'idle',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastSyncTime: Date.now()
      });
    } catch (metadataError) {
      console.error('Failed to update sync metadata after error:', metadataError);
      // Even if metadata update fails, we've logged the original error
    }

    return [];
  }
}

/**
 * Setup automatic periodic sync
 * Returns cleanup function to stop syncing
 */
export function setupPeriodicSync(
  calendarId: string,
  dispatch: (action: any) => void,
  actions: any,
  intervalMinutes: number = 5
): () => void {
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;
  let isActive = true; // Track if sync is still active

  // Initial sync
  (async () => {
    if (!isActive) return; // Check if already stopped
    try {
      await syncFromGoogleCalendar(calendarId, dispatch, actions);
      consecutiveErrors = 0;
    } catch (error) {
      console.error('Initial sync failed:', error);
      consecutiveErrors++;
    }
  })();

  // Setup periodic sync
  const intervalId = setInterval(async () => {
    if (!isActive) {
      clearInterval(intervalId);
      return;
    }

    // Stop syncing if too many consecutive errors
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error('🛑 Too many consecutive sync errors. Stopping periodic sync.');
      isActive = false;
      clearInterval(intervalId);
      return;
    }

    if (await isAuthenticated()) {
      try {
        await syncFromGoogleCalendar(calendarId, dispatch, actions);
        consecutiveErrors = 0; // Reset error count on success
      } catch (error) {
        console.error('Periodic sync failed:', error);
        consecutiveErrors++;
      }
    }
  }, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => {
    isActive = false; // Signal that sync should stop
    clearInterval(intervalId);
  };
}
