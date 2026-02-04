import { db, type GoogleCalendar } from './db';
import { getAccessToken, getCurrentUser } from './google-auth';
import { logger } from './logger';

const log = logger('calendar-storage');

/**
 * CLEAN REBUILD - Calendar storage and retrieval
 * Simple operations with clear error handling
 */

interface GoogleCalendarListItem {
  id: string;
  summary?: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
  primary?: boolean;
  selected?: boolean;
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarListItem[];
}

/**
 * Fetch all calendars from Google Calendar API
 * @param accessToken - Valid access token (pass as parameter to avoid race conditions)
 */
export async function fetchCalendarListFromGoogle(accessToken: string): Promise<GoogleCalendar[]> {
  log.debug('Fetching calendar list from Google...');

  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar list: ${response.statusText}`);
  }

  const data: GoogleCalendarListResponse = await response.json();
  const items = data.items || [];

  log.debug(`Received ${items.length} calendars from Google`);

  // Get current user for userId
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('No user found');
  }

  // Transform Google Calendar format to our format
  const calendars: GoogleCalendar[] = items.map((item) => ({
    id: item.id,
    summary: item.summary || 'Untitled Calendar',
    description: item.description,
    backgroundColor: item.backgroundColor,
    foregroundColor: item.foregroundColor,
    accessRole: item.accessRole,
    primary: item.primary || false,
    selected: item.selected !== false, // Default to true if not specified
    enabled: (item.primary === true || item.selected === true) ? 1 : 0, // Use 1/0 for Dexie indexing
    userId: user.id,
    lastSyncedAt: undefined
  }));

  return calendars;
}

/**
 * Save calendars to IndexedDB
 * Replaces all existing calendars
 */
export async function saveCalendarsToDatabase(calendars: GoogleCalendar[]): Promise<void> {
  log.debug(`Saving ${calendars.length} calendars to database...`);

  // Clear old calendars and add new ones
  await db.calendars.clear();
  await db.calendars.bulkAdd(calendars);

  log.debug('Calendars saved to database');
}

/**
 * Fetch and save calendar list (convenience function)
 */
export async function syncCalendarList(): Promise<GoogleCalendar[]> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const calendars = await fetchCalendarListFromGoogle(accessToken);
  await saveCalendarsToDatabase(calendars);

  return calendars;
}

/**
 * Get all calendars from database
 */
export async function getAllCalendars(): Promise<GoogleCalendar[]> {
  const calendars = await db.calendars.toArray();

  // Sort: primary first, then by name
  calendars.sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return a.summary.localeCompare(b.summary);
  });

  return calendars;
}

/**
 * Get only enabled calendars from database
 */
export async function getEnabledCalendars(): Promise<GoogleCalendar[]> {
  // Use 1 for enabled (Dexie stores booleans as 0/1 internally sometimes)
  const calendars = await db.calendars
    .where('enabled')
    .equals(1)
    .toArray();

  log.debug(`Found ${calendars.length} enabled calendars`);

  // Sort: primary first, then by name
  calendars.sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return a.summary.localeCompare(b.summary);
  });

  return calendars;
}

/**
 * Toggle calendar enabled status
 */
export async function toggleCalendar(calendarId: string, enabled: boolean): Promise<void> {
  await db.calendars.update(calendarId, { enabled: enabled ? 1 : 0 });
  log.debug(`Calendar ${calendarId} ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Get specific calendar by ID
 */
export async function getCalendar(calendarId: string): Promise<GoogleCalendar | undefined> {
  return await db.calendars.get(calendarId);
}
