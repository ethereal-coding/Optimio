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

      console.log('✅ Event created in Google Calendar:', googleEvent.id);
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
      console.log('✅ Event updated in Google Calendar:', event.googleEventId);
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
      console.log('✅ Event deleted from Google Calendar:', event.googleEventId);
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
  actions: any
): Promise<'added' | 'updated' | 'skipped'> {
  try {
    // Check if event already exists in IndexedDB
    const existingEvent = await db.events
      .where('googleEventId')
      .equals(googleEvent.id)
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
        etag: googleEvent.etag
      });

      // Update in state
      dispatch(actions.updateEvent(localCalendarId, {
        ...appEvent,
        id: existingEvent.id // Keep local ID
      }));

      return 'updated';
    } else {
      // Add new event
      const newEvent = {
        ...appEvent,
        syncStatus: 'synced' as const,
        lastSyncedAt: new Date().toISOString(),
        etag: googleEvent.etag
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
    console.log('Not authenticated, skipping Google Calendar sync');
    return [];
  }

  try {
    // Get sync metadata
    const syncMeta = await db.syncMetadata.get('google-calendar-primary');
    if (!syncMeta) {
      console.error('Sync metadata not initialized');
      return [];
    }

    // Check if already syncing (prevent race conditions)
    if (syncMeta.status === 'syncing') {
      console.log('⏭️ Sync already in progress, skipping');
      return [];
    }

    // Set status to syncing
    await db.syncMetadata.update('google-calendar-primary', {
      status: 'syncing',
      lastError: null
    });

    console.log('🔄 Starting incremental sync...');
    console.log('📊 Sync token:', syncMeta.syncToken ? 'Available' : 'None (full sync)');

    // Determine sync token
    const syncToken = options?.forceFullSync ? null : syncMeta.syncToken;

    // Fetch changes from Google
    const { events: googleEvents, nextSyncToken } = await fetchGoogleCalendarChanges('primary', syncToken);

    console.log(`📥 Received ${googleEvents.length} changed events from Google`);

    // Process each changed event
    let addedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    for (const googleEvent of googleEvents) {
      // Debug logging
      console.log('📅 Processing event:', {
        id: googleEvent.id,
        summary: googleEvent.summary,
        hasRecurrence: !!googleEvent.recurrence,
        recurringEventId: googleEvent.recurringEventId,
        startDate: googleEvent.start.date || googleEvent.start.dateTime
      });

      if (googleEvent.status === 'cancelled') {
        // Event deleted
        const existingEvent = await db.events
          .where('googleEventId')
          .equals(googleEvent.id)
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
        console.log('🔁 Expanding recurring event:', googleEvent.summary);
        // Expand recurring event into instances
        const now = new Date();
        const twoYearsAhead = new Date(now.getFullYear() + 2, 11, 31);
        const instances = expandRecurringEvent(googleEvent, now, twoYearsAhead);
        console.log(`  → Generated ${instances.length} instances`);

        for (const instance of instances) {
          console.log(`    • Instance: ${instance.id}, date: ${instance.start.date}`);
          const result = await processEventInstance(instance, localCalendarId, dispatch, actions);
          if (result === 'added') addedCount++;
          if (result === 'updated') updatedCount++;
        }
      } else {
        // Single event or recurring instance
        const result = await processEventInstance(googleEvent, localCalendarId, dispatch, actions);
        if (result === 'added') addedCount++;
        if (result === 'updated') updatedCount++;
      }
    }

    // Update sync metadata
    await db.syncMetadata.update('google-calendar-primary', {
      lastSyncTime: Date.now(),
      syncToken: nextSyncToken,
      status: 'idle',
      fullSyncCompletedAt: syncToken ? syncMeta.fullSyncCompletedAt : Date.now(),
      eventsCount: await db.events.count()
    });

    console.log(`✅ Sync complete: ${addedCount} added, ${updatedCount} updated, ${deletedCount} deleted`);

    // Return all events from database
    const allEvents = await db.events.toArray();
    return allEvents;
  } catch (error) {
    console.error('Failed to sync from Google Calendar:', error);

    // Update sync metadata with error
    await db.syncMetadata.update('google-calendar-primary', {
      status: 'error',
      lastError: error instanceof Error ? error.message : 'Unknown error'
    });

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

  // Initial sync
  (async () => {
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
    // Stop syncing if too many consecutive errors
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error('🛑 Too many consecutive sync errors. Stopping periodic sync.');
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
  return () => clearInterval(intervalId);
}
