import { db, type SyncableEvent } from './db';
import { getAccessToken } from './google-auth';
import { getEnabledCalendars } from './calendar-storage';

/**
 * CLEAN REBUILD - Event syncing from Google Calendar
 * Sequential, simple, no race conditions
 */

/**
 * Fetch events from a single Google Calendar
 * @param calendarId - Google Calendar ID
 * @param accessToken - Valid access token
 * @param dateRange - Optional date range (default: 7 days past to 30 days future)
 */
export async function fetchEventsFromCalendar(
  calendarId: string,
  accessToken: string,
  dateRange?: { start: Date; end: Date }
): Promise<any[]> {
  // Default date range
  const start = dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = dateRange?.end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true', // Expand recurring events
    orderBy: 'startTime',
    maxResults: '2500'
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch events from ${calendarId}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Convert Google Calendar event to our event format
 */
function convertGoogleEventToAppEvent(googleEvent: any, calendarId: string): SyncableEvent {
  // Handle start/end times (can be date or dateTime)
  const startTime = googleEvent.start.dateTime || googleEvent.start.date;
  const endTime = googleEvent.end.dateTime || googleEvent.end.date;

  // Generate unique ID combining Google event ID and calendar ID
  const uniqueId = `${calendarId}:${googleEvent.id}`;

  return {
    id: uniqueId,
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description,
    startTime,
    endTime,
    location: googleEvent.location,
    color: googleEvent.colorId || '1', // Default color
    calendarId: calendarId, // Store which calendar this event belongs to
    isAllDay: !googleEvent.start.dateTime, // All-day if using 'date' instead of 'dateTime'
    recurrence: undefined, // We use singleEvents=true, so recurrence is already expanded
    googleEventId: googleEvent.id,
    lastSyncedAt: new Date().toISOString()
  };
}

/**
 * Save events to database for a specific calendar
 * Replaces all events for that calendar
 */
async function saveEventsForCalendar(calendarId: string, events: SyncableEvent[]): Promise<void> {
  // Delete old events from this calendar
  const oldEvents = await db.events.where('calendarId').equals(calendarId).toArray();
  const oldEventIds = oldEvents.map(e => e.id);

  if (oldEventIds.length > 0) {
    await db.events.bulkDelete(oldEventIds);
  }

  // Add new events
  if (events.length > 0) {
    await db.events.bulkAdd(events);
  }

  console.log(`  ✅ Saved ${events.length} events for calendar ${calendarId}`);
}

/**
 * Sync events from all enabled calendars
 * Sequential execution - simpler and more reliable
 */
export async function syncAllEvents(dateRange?: { start: Date; end: Date }): Promise<{
  success: boolean;
  synced: number;
  errors: string[];
}> {
  console.log('🔄 Starting event sync...');

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const enabledCalendars = await getEnabledCalendars();

  if (enabledCalendars.length === 0) {
    console.log('⚠️ No enabled calendars found');
    return {
      success: true,
      synced: 0,
      errors: []
    };
  }

  console.log(`📅 Syncing ${enabledCalendars.length} calendar(s)...`);

  let totalSynced = 0;
  const errors: string[] = [];

  // Sync each calendar sequentially (no parallel requests)
  for (const calendar of enabledCalendars) {
    try {
      console.log(`  📥 Fetching events from: ${calendar.summary}`);

      const googleEvents = await fetchEventsFromCalendar(calendar.id, accessToken, dateRange);
      const appEvents = googleEvents
        .filter(event => event.status !== 'cancelled') // Skip cancelled events
        .map(event => convertGoogleEventToAppEvent(event, calendar.id));

      await saveEventsForCalendar(calendar.id, appEvents);

      totalSynced += appEvents.length;

      // Update calendar's lastSyncedAt
      await db.calendars.update(calendar.id, {
        lastSyncedAt: new Date().toISOString()
      });
    } catch (error) {
      const errorMsg = `Failed to sync ${calendar.summary}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`  ❌ ${errorMsg}`);
      errors.push(errorMsg);
      // Continue with other calendars
    }
  }

  console.log(`✅ Sync complete: ${totalSynced} events synced`);

  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} calendar(s) failed to sync`);
  }

  return {
    success: errors.length === 0,
    synced: totalSynced,
    errors
  };
}

/**
 * Get events from database (filtered by date range)
 */
export async function getEvents(dateRange?: { start: Date; end: Date }): Promise<SyncableEvent[]> {
  if (!dateRange) {
    // Return all events
    return await db.events.toArray();
  }

  // Filter by date range
  const events = await db.events
    .where('startTime')
    .between(dateRange.start.toISOString(), dateRange.end.toISOString(), true, true)
    .toArray();

  return events;
}

/**
 * Get events for today
 */
export async function getTodayEvents(): Promise<SyncableEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await getEvents({
    start: today,
    end: tomorrow
  });
}
