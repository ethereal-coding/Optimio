import { googleApiRequest } from './google-auth';
import type { Event } from '@/types';

/**
 * Google Calendar API Integration
 * Sync events between Google Calendar and the app
 */

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

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
 * Convert Google Calendar event to app Event format
 */
export function convertGoogleEventToAppEvent(googleEvent: GoogleCalendarEvent, calendarId: string): Event {
  // Parse start and end times
  const startTime = googleEvent.start.dateTime
    ? new Date(googleEvent.start.dateTime)
    : new Date(googleEvent.start.date!);

  const endTime = googleEvent.end.dateTime
    ? new Date(googleEvent.end.dateTime)
    : new Date(googleEvent.end.date!);

  // Map Google Calendar colors to hex colors
  const colorMap: Record<string, string> = {
    '1': '#a4bdfc', // Lavender
    '2': '#7ae7bf', // Sage
    '3': '#dbadff', // Grape
    '4': '#ff887c', // Flamingo
    '5': '#fbd75b', // Banana
    '6': '#ffb878', // Tangerine
    '7': '#46d6db', // Peacock
    '8': '#e1e1e1', // Graphite
    '9': '#5484ed', // Blueberry
    '10': '#51b749', // Basil
    '11': '#dc2127', // Tomato
  };

  const color = googleEvent.colorId ? colorMap[googleEvent.colorId] : '#3b82f6';

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
    googleEventId: googleEvent.id,
    syncedFromGoogle: true
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
    console.log('🔄 Syncing Google Calendar events...');

    const googleEvents = await fetchGoogleCalendarEvents(calendarId, timeMin, timeMax);
    const appEvents = googleEvents
      .filter(event => event.status !== 'cancelled')
      .map(event => convertGoogleEventToAppEvent(event, calendarId));

    console.log(`✅ Synced ${appEvents.length} events from Google Calendar`);

    return appEvents;
  } catch (error) {
    console.error('Failed to sync Google Calendar:', error);
    throw error;
  }
}

/**
 * Create event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  event: Partial<Event>,
  calendarId: string = 'primary'
): Promise<GoogleCalendarEvent> {
  try {
    const googleEvent: Partial<GoogleCalendarEvent> = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.isAllDay
        ? { date: event.startTime?.toISOString().split('T')[0] }
        : { dateTime: event.startTime?.toISOString() },
      end: event.isAllDay
        ? { date: event.endTime?.toISOString().split('T')[0] }
        : { dateTime: event.endTime?.toISOString() },
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
    console.log('✅ Created event in Google Calendar:', createdEvent.id);

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
    const googleEvent: Partial<GoogleCalendarEvent> = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.isAllDay
        ? { date: event.startTime?.toISOString().split('T')[0] }
        : { dateTime: event.startTime?.toISOString() },
      end: event.isAllDay
        ? { date: event.endTime?.toISOString().split('T')[0] }
        : { dateTime: event.endTime?.toISOString() },
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
    console.log('✅ Updated event in Google Calendar:', updatedEvent.id);

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

    console.log('✅ Deleted event from Google Calendar:', eventId);
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
