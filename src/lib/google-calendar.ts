import { googleApiRequest } from './google-auth';
import type { Event } from '@/types';
import { debug } from './debug';

/**
 * Google Calendar API Integration
 * Sync events between Google Calendar and the app
 */

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Google Calendar color palette
// Map of Google Calendar colorId to hex colors
export const GOOGLE_CALENDAR_COLORS: Record<string, { hex: string; name: string }> = {
  '1': { hex: '#a4bdfc', name: 'Lavender' },
  '2': { hex: '#7ae7bf', name: 'Sage' },
  '3': { hex: '#dbadff', name: 'Grape' },
  '4': { hex: '#ff887c', name: 'Flamingo' },
  '5': { hex: '#fbd75b', name: 'Banana' },
  '6': { hex: '#ffb878', name: 'Tangerine' },
  '7': { hex: '#46d6db', name: 'Peacock' },
  '8': { hex: '#e1e1e1', name: 'Graphite' },
  '9': { hex: '#5484ed', name: 'Blueberry' },
  '10': { hex: '#51b749', name: 'Basil' },
  '11': { hex: '#dc2127', name: 'Tomato' },
};

// Reverse mapping: hex to colorId
export const hexToGoogleColorId = (hex: string): string | undefined => {
  const entry = Object.entries(GOOGLE_CALENDAR_COLORS).find(([_, color]) =>
    color.hex.toLowerCase() === hex.toLowerCase()
  );
  return entry?.[0];
};

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
  status?: string;
  recurrence?: string[]; // RRULE array for recurring events
  recurringEventId?: string; // ID of the master recurring event (for instances)
  etag?: string; // Version identifier for conflict detection
}

export interface GoogleCalendarListEntry {
  id: string; // Calendar ID (e.g., 'primary', 'email@gmail.com', 'holiday@group.v.calendar.google.com')
  summary: string; // Calendar name (e.g., 'Work', 'Personal', 'Holidays')
  description?: string;
  timeZone?: string;
  backgroundColor?: string; // Hex color
  foregroundColor?: string;
  selected?: boolean; // Whether visible in Google Calendar UI
  accessRole?: string; // 'owner', 'writer', 'reader', etc.
  primary?: boolean; // True for the user's primary calendar
}

/**
 * Fetch the list of all calendars accessible to the user
 */
export async function fetchCalendarList(): Promise<GoogleCalendarListEntry[]> {
  try {
    const response = await googleApiRequest(
      `${CALENDAR_API_BASE}/users/me/calendarList`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar list: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch calendar list:', error);
    throw error;
  }
}

/**
 * Fetch events from Google Calendar
 */
export async function fetchGoogleCalendarEvents(
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date
): Promise<GoogleCalendarEvent[]> {
  try {
    const params = new URLSearchParams({
      calendarId,
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (timeMin) {
      params.append('timeMin', timeMin.toISOString());
    }

    if (timeMax) {
      params.append('timeMax', timeMax.toISOString());
    }

    const response = await googleApiRequest(
      `${CALENDAR_API_BASE}/calendars/${calendarId}/events?${params}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch Google Calendar events:', error);
    throw error;
  }
}

/**
 * Parse Google Calendar RRULE to app recurrence format
 */
function parseRecurrenceRule(rrules?: string[]): 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' {
  if (!rrules || rrules.length === 0) return 'none';

  // RRULE format: "RRULE:FREQ=DAILY;COUNT=5" or similar
  const rrule = rrules[0];

  if (rrule.includes('FREQ=DAILY')) return 'daily';
  if (rrule.includes('FREQ=WEEKLY')) return 'weekly';
  if (rrule.includes('FREQ=MONTHLY')) return 'monthly';
  if (rrule.includes('FREQ=YEARLY')) return 'yearly';

  return 'none';
}

/**
 * Parse a YYYY-MM-DD date string to local Date (avoiding timezone issues)
 * All-day events should always display on the correct date regardless of timezone
 */
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  const [year, month, day] = parts;
  // Use local date constructor to avoid UTC conversion issues
  // Month is 0-indexed in JavaScript Date
  return new Date(year, month - 1, day);
}

/**
 * Convert Google Calendar event to app Event format
 */
export function convertGoogleEventToAppEvent(googleEvent: GoogleCalendarEvent, calendarId: string): Event {
  // Parse start and end times
  // For all-day events (date without time), create proper day boundaries

  const isAllDay = !googleEvent.start.dateTime;

  let startTime: Date;
  let endTime: Date;

  if (isAllDay) {
    // All-day events: parse YYYY-MM-DD as local date to avoid timezone shifts
    if (!googleEvent.start.date) {
      throw new Error('All-day event missing start.date');
    }
    startTime = parseLocalDate(googleEvent.start.date);
    startTime.setHours(0, 0, 0, 0); // Start of day

    // For multi-day all-day events, Google returns end.date as the day AFTER the last day
    // e.g., a 3-day event starting March 15 has end.date = "2024-03-18"
    // We need to subtract one day to get the actual end date
    if (googleEvent.end?.date) {
      endTime = parseLocalDate(googleEvent.end.date);
      // Subtract 1 millisecond to get the last moment of the previous day
      endTime.setTime(endTime.getTime() - 1);
    } else {
      // Single day event - end at end of start day
      endTime = new Date(startTime.getTime());
      endTime.setHours(23, 59, 59, 999);
    }
  } else {
    // Timed events: use standard Date parsing which handles timezones
    startTime = new Date(googleEvent.start.dateTime!);
    endTime = new Date(googleEvent.end.dateTime!);
  }

  // Map Google Calendar colors to hex colors
  const color = googleEvent.colorId && GOOGLE_CALENDAR_COLORS[googleEvent.colorId]
    ? GOOGLE_CALENDAR_COLORS[googleEvent.colorId].hex
    : '#5484ed'; // Default to Blueberry
  
  if (googleEvent.colorId) {
    debug.log(`  🎨 Event "${googleEvent.summary}" - Google colorId: ${googleEvent.colorId} → ${color}`);
  }

  // Determine recurrence: either from the recurrence rules, or if this is a recurring instance,
  // we'll need to fetch the master event to know the pattern. For now, mark as 'yearly' for birthdays
  let recurrence = parseRecurrenceRule(googleEvent.recurrence);

  // If this is a recurring event instance without explicit recurrence rules,
  // mark it as recurring (we'll default to yearly for all-day recurring events like birthdays)
  if (recurrence === 'none' && googleEvent.recurringEventId && isAllDay) {
    recurrence = 'yearly'; // Most likely a birthday or anniversary
  }

  return {
    id: googleEvent.id,
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description,
    startTime,
    endTime,
    location: googleEvent.location,
    color,
    calendarId,
    isAllDay: !googleEvent.start.dateTime,
    recurrence,
    googleEventId: googleEvent.id,
    syncedFromGoogle: true,
    etag: googleEvent.etag,
    recurringEventId: googleEvent.recurringEventId,
    isRecurringInstance: !!googleEvent.recurringEventId
  };
}

/**
 * Sync Google Calendar events to the app
 * Returns array of app Event objects
 */
export async function syncGoogleCalendar(
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date
): Promise<Event[]> {
  try {
    debug.log('🔄 Syncing Google Calendar events...');
    debug.log('📅 Calendar ID:', calendarId);
    debug.log('📆 Time range:', { timeMin, timeMax });

    const googleEvents = await fetchGoogleCalendarEvents(calendarId, timeMin, timeMax);
    debug.log('📥 Received', googleEvents.length, 'events from Google');

    // Track recurring event series we've already imported
    const importedRecurringSeries = new Set<string>();

    const appEvents = googleEvents
      .filter(event => {
        // Filter out cancelled events
        if (event.status === 'cancelled') return false;

        // For recurring event instances, only import the first occurrence
        if (event.recurringEventId) {
          if (importedRecurringSeries.has(event.recurringEventId)) {
            debug.log('⏭️ Skipping duplicate recurring instance:', event.summary);
            return false;
          }
          importedRecurringSeries.add(event.recurringEventId);
        }

        return true;
      })
      .map(event => convertGoogleEventToAppEvent(event, calendarId));

    debug.log(`✅ Synced ${appEvents.length} events from Google Calendar`);
    if (appEvents.length > 0) {
      debug.log('🎯 Sample event:', appEvents[0]);
    }

    return appEvents;
  } catch (error) {
    console.error('❌ Failed to sync Google Calendar:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Sync events from multiple Google Calendars
 * Fetches from all enabled calendars and merges results
 */
export async function syncMultipleGoogleCalendars(
  localCalendarId: string,
  timeMin?: Date,
  timeMax?: Date
): Promise<Event[]> {
  try {
    const { db } = await import('./db');

    // Get calendar preferences - only fetch from enabled calendars
    const prefs = await db.calendarPreferences.where('enabled').equals(1).toArray();

    if (prefs.length === 0) {
      debug.log('⚠️ No enabled calendars found, defaulting to primary calendar');
      return syncGoogleCalendar('primary', timeMin, timeMax);
    }

    debug.log(`🔄 Syncing ${prefs.length} enabled calendar(s)...`);

    const allEvents: Event[] = [];
    const importedRecurringSeries = new Set<string>();

    // Fetch events from each enabled calendar
    for (const pref of prefs) {
      try {
        debug.log(`📥 Fetching from ${pref.summary} (${pref.id})`);

        const googleEvents = await fetchGoogleCalendarEvents(pref.id, timeMin, timeMax);
        debug.log(`  ✅ Received ${googleEvents.length} events`);

        const filteredEvents = googleEvents
          .filter(event => {
            // Filter out cancelled events
            if (event.status === 'cancelled') return false;

            // For recurring event instances, only import the first occurrence across ALL calendars
            if (event.recurringEventId) {
              const seriesKey = `${pref.id}:${event.recurringEventId}`;
              if (importedRecurringSeries.has(seriesKey)) {
                debug.log('⏭️ Skipping duplicate recurring instance:', event.summary);
                return false;
              }
              importedRecurringSeries.add(seriesKey);
            }

            return true;
          })
          .map(event => {
            const appEvent = convertGoogleEventToAppEvent(event, localCalendarId);
            // Tag event with source calendar for display/filtering
            return {
              ...appEvent,
              sourceCalendarId: pref.id,
              sourceCalendarName: pref.summary,
              sourceCalendarColor: pref.color
            };
          });

        allEvents.push(...filteredEvents);
      } catch (error) {
        console.error(`❌ Failed to fetch from calendar ${pref.summary}:`, error);
        // Continue with other calendars even if one fails
      }
    }

    debug.log(`✅ Synced ${allEvents.length} total events from ${prefs.length} calendar(s)`);
    return allEvents;
  } catch (error) {
    console.error('❌ Failed to sync multiple calendars:', error);
    throw error;
  }
}

/**
 * Convert app recurrence format to Google Calendar RRULE
 */
function convertToGoogleRecurrence(recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'): string[] | undefined {
  if (!recurrence || recurrence === 'none') return undefined;

  const rruleMap: Record<string, string> = {
    daily: 'RRULE:FREQ=DAILY',
    weekly: 'RRULE:FREQ=WEEKLY',
    monthly: 'RRULE:FREQ=MONTHLY',
    yearly: 'RRULE:FREQ=YEARLY'
  };

  return [rruleMap[recurrence]];
}

/**
 * Create event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  event: Partial<Event>,
  calendarId: string = 'primary'
): Promise<GoogleCalendarEvent> {
  try {
    if (!event.startTime || !event.endTime) {
      throw new Error('Event must have startTime and endTime');
    }

    const googleEvent: Partial<GoogleCalendarEvent> = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.isAllDay
        ? { date: event.startTime.toISOString().split('T')[0] }
        : { dateTime: event.startTime.toISOString() },
      end: event.isAllDay
        ? { date: event.endTime.toISOString().split('T')[0] }
        : { dateTime: event.endTime.toISOString() },
      colorId: event.color ? hexToGoogleColorId(event.color) : undefined,
      recurrence: convertToGoogleRecurrence(event.recurrence),
    };

    const response = await googleApiRequest(
      `${CALENDAR_API_BASE}/calendars/${calendarId}/events`,
      {
        method: 'POST',
        body: JSON.stringify(googleEvent)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }

    const createdEvent = await response.json();
    debug.log('✅ Created event in Google Calendar:', createdEvent.id);

    return createdEvent;
  } catch (error) {
    console.error('Failed to create Google Calendar event:', error);
    throw error;
  }
}

/**
 * Update event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  eventId: string,
  event: Partial<Event>,
  calendarId: string = 'primary'
): Promise<GoogleCalendarEvent> {
  try {
    if (!event.startTime || !event.endTime) {
      throw new Error('Event must have startTime and endTime');
    }

    const googleEvent: Partial<GoogleCalendarEvent> = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.isAllDay
        ? { date: event.startTime.toISOString().split('T')[0] }
        : { dateTime: event.startTime.toISOString() },
      end: event.isAllDay
        ? { date: event.endTime.toISOString().split('T')[0] }
        : { dateTime: event.endTime.toISOString() },
      colorId: event.color ? hexToGoogleColorId(event.color) : undefined,
      recurrence: convertToGoogleRecurrence(event.recurrence),
    };

    const response = await googleApiRequest(
      `${CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PUT',
        body: JSON.stringify(googleEvent)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.statusText}`);
    }

    const updatedEvent = await response.json();
    debug.log('✅ Updated event in Google Calendar:', updatedEvent.id);

    return updatedEvent;
  } catch (error) {
    console.error('Failed to update Google Calendar event:', error);
    throw error;
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  try {
    const response = await googleApiRequest(
      `${CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`,
      { method: 'DELETE' }
    );

    if (!response.ok && response.status !== 410) { // 410 = already deleted
      throw new Error(`Failed to delete event: ${response.statusText}`);
    }

    debug.log('✅ Deleted event from Google Calendar:', eventId);
  } catch (error) {
    console.error('Failed to delete Google Calendar event:', error);
    throw error;
  }
}

/**
 * List all calendars
 */
export async function listGoogleCalendars(): Promise<any[]> {
  try {
    const response = await googleApiRequest(
      `${CALENDAR_API_BASE}/users/me/calendarList`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch calendars: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to list Google Calendars:', error);
    throw error;
  }
}

/**
 * Fetch events incrementally using sync token
 * Returns only changed events since last sync
 */
export async function fetchGoogleCalendarChanges(
  calendarId: string = 'primary',
  syncToken: string | null
): Promise<{
  events: GoogleCalendarEvent[];
  nextSyncToken: string;
  nextPageToken?: string;
}> {
  try {
    const params = new URLSearchParams({
      showDeleted: 'true' // Include deleted events
    });

    if (syncToken) {
      params.append('syncToken', syncToken);
    } else {
      // Initial sync: fetch from 1 year ago
      const timeMin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      params.append('timeMin', timeMin.toISOString());
      params.append('singleEvents', 'false'); // Get master recurring events
    }

    const response = await googleApiRequest(
      `${CALENDAR_API_BASE}/calendars/${calendarId}/events?${params}`
    );

    if (!response.ok) {
      // Sync token invalid - need full sync
      if (response.status === 410) {
        debug.log('⚠️ Sync token expired, performing full sync');
        return fetchGoogleCalendarChanges(calendarId, null);
      }
      throw new Error(`Failed to fetch changes: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      events: data.items || [],
      nextSyncToken: data.nextSyncToken,
      nextPageToken: data.nextPageToken
    };
  } catch (error) {
    console.error('Failed to fetch calendar changes:', error);
    throw error;
  }
}

/**
 * Generate instances for recurring events locally
 * Avoids fetching all instances from Google
 */
export function expandRecurringEvent(
  masterEvent: GoogleCalendarEvent,
  startDate: Date,
  endDate: Date
): GoogleCalendarEvent[] {
  // Simple implementation for yearly recurrence (birthdays)
  if (!masterEvent.recurrence) return [masterEvent];

  const instances: GoogleCalendarEvent[] = [];
  const recurrence = parseRecurrenceRule(masterEvent.recurrence);

  debug.log('🔧 Expanding event:', {
    summary: masterEvent.summary,
    recurrence,
    originalDate: masterEvent.start.date,
    startYear: startDate.getFullYear(),
    endYear: endDate.getFullYear()
  });

  if (recurrence === 'yearly' && masterEvent.start.date) {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    const parts = masterEvent.start.date.split('-');
    if (parts.length !== 3) {
      console.error(`Invalid date format for recurring event: ${masterEvent.start.date}`);
      return [masterEvent];
    }
    const [_, monthStr, dayStr] = parts;
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Pad with leading zeros for proper YYYY-MM-DD format
    const paddedMonth = month.toString().padStart(2, '0');
    const paddedDay = day.toString().padStart(2, '0');

    debug.log(`  → Parsed date parts: year=?, month=${paddedMonth}, day=${paddedDay}`);

    for (let year = startYear; year <= endYear; year++) {
      // Validate date (handles leap year Feb 29 case)
      const testDate = new Date(year, month - 1, day);
      if (
        testDate.getFullYear() !== year ||
        testDate.getMonth() !== month - 1 ||
        testDate.getDate() !== day
      ) {
        debug.log(`  → Skipping invalid date: ${year}-${paddedMonth}-${paddedDay} (e.g., Feb 29 in non-leap year)`);
        continue;
      }

      const instanceDate = `${year}-${paddedMonth}-${paddedDay}`;

      const instance: GoogleCalendarEvent = {
        ...masterEvent,
        id: `${masterEvent.id}_${year}`, // Create instance with unique ID
        start: { date: instanceDate },
        end: { date: instanceDate },
        recurringEventId: masterEvent.id // Track master event
      };

      debug.log(`  → Created instance for ${instanceDate}`);
      instances.push(instance);
    }
  } else {
    // For other recurrence types, return master event as-is
    debug.log(`  → Non-yearly or no date, returning as-is`);
    instances.push(masterEvent);
  }

  return instances;
}
