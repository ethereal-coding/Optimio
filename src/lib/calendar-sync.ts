import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  fetchGoogleCalendarEvents,
  expandRecurringEvent,
  convertGoogleEventToAppEvent,
  type GoogleCalendarEvent
} from './google-calendar';
import { isAuthenticated } from './google-auth';
import { db } from './db';
import type { CalendarEvent } from '@/types';
import { debug } from './debug';
import { notify } from './notifications';
import { analytics } from './analytics';

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

  // Also save to IndexedDB so it persists after refresh
  try {
    await db.events.put({
      ...localEvent,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Event saved to IndexedDB:', localEvent.id);
  } catch (dbError) {
    console.error('Failed to save event to IndexedDB:', dbError);
  }

  // Try to sync with Google Calendar if signed in
  if (await isAuthenticated()) {
    try {
      debug.log('🎨 Creating event with color:', event.color);
      
      // Always use 'primary' for Google Calendar API
      const googleEvent = await createGoogleCalendarEvent(event, 'primary');

      // Update local event with Google ID and color from Google
      const syncedEvent: CalendarEvent = {
        ...localEvent,
        googleEventId: googleEvent.id,
        syncedFromGoogle: true,
        sourceCalendarId: 'primary', // Mark as synced from primary calendar
        // Preserve the color we sent (Google should return the same)
        color: event.color
      };

      // Update in local state with Google ID
      dispatch(actions.updateEvent(calendarId, syncedEvent));

      // Also update IndexedDB with the Google ID
      try {
        await db.events.update(syncedEvent.id, {
          ...syncedEvent,
          lastSyncedAt: new Date().toISOString()
        });
        debug.log('💾 Synced event updated in IndexedDB:', syncedEvent.id);
      } catch (dbError) {
        console.error('Failed to update synced event in IndexedDB:', dbError);
      }

      debug.log('✅ Event created in Google Calendar:', googleEvent.id, 'with color:', googleEvent.colorId);
      notify.eventCreated(event.title);
      analytics.eventCreated({ calendarId: 'primary' });
      return syncedEvent;
    } catch (error) {
      console.error('Failed to sync event to Google Calendar:', error);
      notify.error('Failed to sync to Google Calendar', {
        description: 'Event saved locally',
      });
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

  // Also update in IndexedDB so changes persist after refresh
  try {
    await db.events.update(event.id, {
      ...event,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Event updated in IndexedDB:', event.id);
  } catch (dbError) {
    console.error('Failed to update event in IndexedDB:', dbError);
  }

  // Sync with Google Calendar if this event was synced
  if (event.googleEventId && await isAuthenticated()) {
    try {
      debug.log('🎨 Updating event with color:', event.color);
      
      // Use the source calendar ID if available, otherwise default to 'primary'
      const googleCalendarId = event.sourceCalendarId || 'primary';
      const updatedGoogleEvent = await updateGoogleCalendarEvent(event.googleEventId, event, googleCalendarId);
      debug.log('✅ Event updated in Google Calendar:', event.googleEventId, 'with color:', updatedGoogleEvent.colorId);
      notify.eventUpdated(event.title);
      analytics.eventUpdated({ calendarId: googleCalendarId });
    } catch (error) {
      console.error('Failed to update event in Google Calendar:', error);
      notify.error('Failed to update in Google Calendar', {
        description: 'Local changes saved',
      });
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

  // Also delete from IndexedDB
  try {
    await db.events.delete(eventId);
    debug.log('🗑️ Event deleted from IndexedDB:', eventId);
  } catch (dbError) {
    console.error('Failed to delete event from IndexedDB:', dbError);
  }

  // Delete from Google Calendar if this event was synced
  if (event?.googleEventId && await isAuthenticated()) {
    try {
      // Use the source calendar ID if available, otherwise default to 'primary'
      const googleCalendarId = event.sourceCalendarId || 'primary';
      await deleteGoogleCalendarEvent(event.googleEventId, googleCalendarId);
      debug.log('✅ Event deleted from Google Calendar:', event.googleEventId);
      notify.eventDeleted(event.title);
      analytics.eventDeleted({ calendarId: googleCalendarId });
    } catch (error) {
      console.error('Failed to delete event from Google Calendar:', error);
      notify.error('Failed to delete from Google Calendar', {
        description: 'Event removed locally',
      });
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
  actions: any
): Promise<CalendarEvent[]> {
  if (!await isAuthenticated()) {
    debug.log('Not authenticated, skipping Google Calendar sync');
    return [];
  }

  try {
    // Get all enabled calendars from the database
    const enabledCalendars = await db.calendars.where('enabled').equals(1).toArray();

    if (enabledCalendars.length === 0) {
      debug.log('⚠️ No enabled calendars found');
      return [];
    }

    debug.log(`🔄 Syncing ${enabledCalendars.length} calendar(s)...`);

    let totalAdded = 0;
    let totalUpdated = 0;

    // Sync each enabled calendar
    for (const calendar of enabledCalendars) {
      debug.log(`📅 Syncing calendar: ${calendar.summary} (${calendar.id})`);

      try {
        // Simple time-based sync: last 90 days to 1 year ahead
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 90);
        const timeMax = new Date();
        timeMax.setFullYear(timeMax.getFullYear() + 1);

        // Fetch events from this calendar
        const googleEvents = await fetchGoogleCalendarEvents(calendar.id, timeMin, timeMax);
        debug.log(`📥 Received ${googleEvents.length} events from ${calendar.summary}`);

        // Process each event
        let addedCount = 0;
        let updatedCount = 0;

        for (const googleEvent of googleEvents) {
          // Skip cancelled events
          if (googleEvent.status === 'cancelled') {
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

        // Update calendar's last sync time
        await db.calendars.update(calendar.id, {
          lastSyncedAt: new Date().toISOString()
        });

        debug.log(`  ✅ ${calendar.summary}: ${addedCount} added, ${updatedCount} updated`);

        totalAdded += addedCount;
        totalUpdated += updatedCount;
      } catch (calendarError) {
        console.error(`Failed to sync calendar ${calendar.summary}:`, calendarError);
        // Continue with other calendars
      }
    }

    debug.log(`✅ Multi-calendar sync complete: ${totalAdded} added, ${totalUpdated} updated`);

    // Return all events from database
    const allEvents = await db.events.toArray();
    return allEvents;
  } catch (error) {
    console.error('Failed to sync from Google Calendar:', error);
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
