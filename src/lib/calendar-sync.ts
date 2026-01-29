import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  syncGoogleCalendar
} from './google-calendar';
import { isAuthenticated } from './google-auth';
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
      const googleEvent = await createGoogleCalendarEvent(event, calendarId);

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
 * Sync Google Calendar events to local state
 * Call this on app load or periodically
 */
export async function syncFromGoogleCalendar(
  calendarId: string,
  dispatch: (action: any) => void,
  actions: any,
  options?: {
    timeMin?: Date;
    timeMax?: Date;
    mergeWithExisting?: boolean;
  }
): Promise<CalendarEvent[]> {
  if (!await isAuthenticated()) {
    console.log('Not authenticated, skipping Google Calendar sync');
    return [];
  }

  try {
    console.log('🔄 Syncing from Google Calendar...');

    const googleEvents = await syncGoogleCalendar(
      calendarId,
      options?.timeMin,
      options?.timeMax
    );

    // If mergeWithExisting is true, add events individually
    // Otherwise, replace all events (not recommended for now)
    if (options?.mergeWithExisting !== false) {
      googleEvents.forEach(event => {
        dispatch(actions.addEvent(calendarId, event));
      });
    }

    console.log(`✅ Synced ${googleEvents.length} events from Google Calendar`);
    return googleEvents;
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
  // Initial sync
  syncFromGoogleCalendar(calendarId, dispatch, actions, {
    mergeWithExisting: true
  });

  // Setup periodic sync
  const intervalId = setInterval(async () => {
    if (await isAuthenticated()) {
      await syncFromGoogleCalendar(calendarId, dispatch, actions, {
        mergeWithExisting: true
      });
    }
  }, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => clearInterval(intervalId);
}
