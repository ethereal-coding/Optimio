import { db, type SyncableEvent } from './db';
import { getAccessToken } from './google-auth';
import { getEnabledCalendars } from './calendar-storage';
import { logger } from './logger';
import { analytics } from './analytics';
import type { GoogleEventType } from '@/schemas/google-calendar';

const log = logger('event-sync');

/**
 * CLEAN REBUILD - Event syncing from Google Calendar
 * Sequential, simple, no race conditions
 */

/**
 * Fetch events from a single Google Calendar
 * @param calendarId - Google Calendar ID
 * @param accessToken - Valid access token
 * @param dateRange - Optional date range (default: 90 days past to 1 year future)
 */
export async function fetchEventsFromCalendar(
  calendarId: string,
  accessToken: string,
  dateRange?: { start: Date; end: Date }
): Promise<GoogleEventType[]> {
  // Default date range: 90 days past to 1 year future
  const start = dateRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = dateRange?.end || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true', // Expand recurring events
    orderBy: 'startTime',
    maxResults: '2500'
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  log.debug(`Fetching: ${url.substring(0, 100)}...`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch events from ${calendarId}: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Create a unique deduplication key for an event
 * This helps identify duplicates across calendars
 */
function createEventDedupKey(event: GoogleEventType): string {
  // For recurring instances (like birthdays), use the recurringEventId + start time
  // This ensures the same birthday from different calendars is deduplicated
  if (event.recurringEventId) {
    const startTime = event.start?.dateTime || event.start?.date || '';
    return `${event.recurringEventId}|${startTime}`;
  }
  
  // For regular events, use title + start time to catch duplicates across calendars
  // This handles cases where the same event might be in multiple calendars
  const startTime = event.start?.dateTime || event.start?.date || '';
  const title = event.summary || '';
  
  // For all-day events, just use title + date (ignore calendar-specific IDs)
  if (event.start?.date && !event.start?.dateTime) {
    return `${title}|${startTime}`;
  }
  
  // For timed events, use the event ID (more unique)
  return event.id || `${title}|${startTime}`;
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
  return new Date(year, month - 1, day);
}

/**
 * Convert Google Calendar event to our event format
 */
function convertGoogleEventToAppEvent(googleEvent: GoogleEventType, calendarId: string): SyncableEvent {
  // Handle start/end times (can be date or dateTime)
  const isAllDay = !googleEvent.start?.dateTime;
  
  // Convert to Date objects
  let startTime: Date;
  let endTime: Date;
  
  if (isAllDay) {
    // All-day events: parse YYYY-MM-DD strings as local dates (not UTC)
    // to avoid timezone shift issues
    const startDateStr = googleEvent.start?.date;
    const endDateStr = googleEvent.end?.date; // Google returns EXCLUSIVE end date
    
    if (!startDateStr) {
      throw new Error('All-day event missing start.date');
    }
    
    startTime = parseLocalDate(startDateStr);
    startTime.setHours(0, 0, 0, 0);
    
    // For multi-day all-day events, Google returns end.date as the day AFTER the last day
    // e.g., a 3-day event starting March 15 has end.date = "2024-03-18"
    // We need to subtract one day to get the actual end date
    if (endDateStr) {
      endTime = parseLocalDate(endDateStr);
      // Subtract 1 millisecond to get the last moment of the previous day
      endTime.setTime(endTime.getTime() - 1);
    } else {
      // Single day event - end at end of start day
      endTime = new Date(startTime.getTime());
      endTime.setHours(23, 59, 59, 999);
    }
  } else {
    // Timed events: use standard Date parsing with timezone
    const startStr = googleEvent.start?.dateTime;
    const endStr = googleEvent.end?.dateTime;
    startTime = startStr ? new Date(startStr) : new Date();
    endTime = endStr ? new Date(endStr) : new Date(startTime.getTime() + 60 * 60 * 1000);
  }

  // Generate unique ID combining Google event ID and calendar ID
  const uniqueId = `${calendarId}:${googleEvent.id}`;

  // Map Google color ID to hex color
  const colorMap: Record<string, string> = {
    '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c',
    '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1',
    '9': '#5484ed', '10': '#51b749', '11': '#dc2127'
  };

  const color = colorMap[googleEvent.colorId] || '#5484ed';
  
  if (googleEvent.colorId) {
    console.log(`  🎨 Event "${googleEvent.summary}" - Google colorId: ${googleEvent.colorId} → ${color}`);
  }

  return {
    id: uniqueId,
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description,
    startTime,
    endTime,
    location: googleEvent.location,
    color,
    calendarId: '1', // Local calendar ID
    sourceCalendarId: calendarId, // Which Google calendar this came from
    isAllDay: !googleEvent.start?.dateTime, // All-day if using 'date' instead of 'dateTime'
    recurrence: 'none',
    googleEventId: googleEvent.id,
    lastSyncedAt: new Date().toISOString(),
    etag: googleEvent.etag,
    recurringEventId: googleEvent.recurringEventId,
    isRecurringInstance: !!googleEvent.recurringEventId
  };
}

/**
 * Save events to database for a specific calendar
 * Replaces all events for that calendar and removes events that no longer exist in Google
 */
async function saveEventsForCalendar(
  sourceCalendarId: string, 
  events: SyncableEvent[],
  removedEventIds?: string[]
): Promise<{ deleted: number; added: number }> {
  log.info(`Saving ${events.length} events for calendar ${sourceCalendarId}`);
  log.debug('New events from Google', { events: events.map(e => ({ id: e.id, googleId: e.googleEventId, title: e.title })) });

  // Collect all event IDs to delete:
  // 1. Events with matching sourceCalendarId (for full replacement)
  // 2. Events with matching googleEventId (to prevent duplicates from local creation)
  const eventsToDelete = new Map<string, SyncableEvent>(); // id -> event

  // 1. Find events with matching sourceCalendarId
  const oldEvents = await db.events
    .where('sourceCalendarId')
    .equals(sourceCalendarId)
    .toArray();
  
  log.debug(`Found ${oldEvents.length} existing events`, { sourceCalendarId });
  
  for (const event of oldEvents) {
    eventsToDelete.set(event.id, event);
  }

  // 2. Find events with matching googleEventId (prevents duplicates from local creation)
  const googleEventIds = events.map(e => e.googleEventId).filter((id): id is string => !!id);
  log.debug(`Checking ${googleEventIds.length} events for duplicates`);
  
  for (const googleId of googleEventIds) {
    const existingWithSameGoogleId = await db.events
      .where('googleEventId')
      .equals(googleId)
      .toArray();
    
    for (const event of existingWithSameGoogleId) {
      if (!eventsToDelete.has(event.id)) {
        eventsToDelete.set(event.id, event);
        log.info('Duplicate detected', { 
          eventId: event.id, 
          title: event.title, 
          googleEventId: event.googleEventId 
        });
      }
    }
  }

  // 3. Also delete specific removed events if provided (for targeted deletion)
  if (removedEventIds && removedEventIds.length > 0) {
    log.info(`Adding ${removedEventIds.length} specifically removed events to deletion list`);
    for (const removedId of removedEventIds) {
      // Find the local event with this googleEventId
      const localEvents = await db.events
        .where('googleEventId')
        .equals(removedId)
        .toArray();
      for (const event of localEvents) {
        eventsToDelete.set(event.id, event);
        log.debug(`Marked removed event for deletion`, { eventId: event.id, googleEventId: removedId });
      }
    }
  }

  const oldEventIds = Array.from(eventsToDelete.keys());
  log.info(`Total events to delete: ${oldEventIds.length}`);

  let deletedCount = 0;
  if (oldEventIds.length > 0) {
    try {
      await db.events.bulkDelete(oldEventIds);
      deletedCount = oldEventIds.length;
      log.info(`Deleted ${deletedCount} old events`);
    } catch (error) {
      log.error('Failed to delete old events', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Add new events
  let addedCount = 0;
  if (events.length > 0) {
    try {
      await db.events.bulkAdd(events);
      addedCount = events.length;
      log.info(`Added ${addedCount} new events`);
    } catch (error) {
      log.error('Failed to add new events', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  return { deleted: deletedCount, added: addedCount };
}

/**
 * Sync events from all enabled calendars
 * Sequential execution - simpler and more reliable
 */
export async function syncAllEvents(dateRange?: { start: Date; end: Date }): Promise<{
  success: boolean;
  added: number;
  updated: number;
  removed: number;
  errors: string[];
}> {
  const syncStartTime = Date.now();
  console.log('🚨 EMERGENCY DEBUG: syncAllEvents() STARTED at', new Date().toISOString());

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated - no access token available');
  }

  const enabledCalendars = await getEnabledCalendars();

  if (enabledCalendars.length === 0) {
    console.log('⚠️ No enabled calendars found');
    return {
      success: true,
      added: 0,
      updated: 0,
      removed: 0,
      errors: []
    };
  }

  console.log(`📅 Syncing ${enabledCalendars.length} calendar(s): ${enabledCalendars.map(c => c.summary).join(', ')}`);

  let totalAdded = 0;
  let totalUpdated = 0;
  let totalRemoved = 0;
  const errors: string[] = [];
  
  // Track all event deduplication keys across calendars to prevent duplicates
  const seenEventKeys = new Set<string>();

  // Sync each calendar sequentially (no parallel requests)
  for (const calendar of enabledCalendars) {
    try {
      console.log(`  📥 Fetching events from: ${calendar.summary} (${calendar.id})`);

      const googleEvents = await fetchEventsFromCalendar(calendar.id, accessToken, dateRange);
      console.log(`  📥 Received ${googleEvents.length} events from Google`);

      // Get existing events for this calendar to track updates vs adds
      const existingEvents = await db.events
        .where('sourceCalendarId')
        .equals(calendar.id)
        .toArray();
      console.log(`  📊 Found ${existingEvents.length} existing events in DB for calendar ${calendar.summary}`);
      
      const existingEventIds = new Set(existingEvents.map(e => e.googleEventId).filter((id): id is string => !!id));
      console.log(`  🚨 EMERGENCY DEBUG: ${existingEventIds.size} existing events have googleEventId`);
      console.log(`  🚨 EMERGENCY DEBUG: existingEventIds =`, Array.from(existingEventIds).slice(0, 10));
      
      const newEventIds = new Set<string>();

      // Filter and deduplicate events
      const appEvents: SyncableEvent[] = [];
      let skippedCount = 0;
      
      for (const event of googleEvents) {
        // Skip cancelled events
        if (event.status === 'cancelled') continue;
        
        // Create deduplication key
        const dedupKey = createEventDedupKey(event);
        
        // Skip if we've already seen this event (from another calendar)
        if (seenEventKeys.has(dedupKey)) {
          console.log(`    ⏭️ Skipping duplicate: ${event.summary} (${dedupKey})`);
          skippedCount++;
          continue;
        }
        
        // Mark as seen
        seenEventKeys.add(dedupKey);
        newEventIds.add(event.id);
        
        // Track if this is an update or add
        if (existingEventIds.has(event.id)) {
          totalUpdated++;
        } else {
          totalAdded++;
        }
        
        // Convert and add to list
        const appEvent = convertGoogleEventToAppEvent(event, calendar.id);
        appEvents.push(appEvent);
      }

      // Track removed events (exist locally but not in Google anymore)
      const removedEventIds: string[] = [];
      // Check for removed events (exist locally but not in Google anymore)

      for (const existingId of existingEventIds) {
        const isInNewEvents = newEventIds.has(existingId);

        if (!isInNewEvents) {
          totalRemoved++;
          removedEventIds.push(existingId);
          console.log(`    🗑️🗑️🗑️ EVENT DETECTED AS REMOVED: ${existingId}`);
        }
      }
      if (removedEventIds.length > 0) {
        console.log(`  🚨 EMERGENCY DEBUG: Total removed events for this calendar: ${removedEventIds.length}`);
      } // else: no removed events, nothing to log

      // Calculate per-calendar stats
      const addedCalendar = appEvents.filter(e => !existingEventIds.has(e.googleEventId || '')).length;
      const updatedCalendar = appEvents.filter(e => existingEventIds.has(e.googleEventId || '')).length;
      
      console.log(`  📝 Processed ${appEvents.length} unique events (${skippedCount} duplicates skipped)`);
      console.log(`  📊 Stats for this calendar: ${addedCalendar} added, ${updatedCalendar} updated, ${removedEventIds.length} to be removed`);
      
      const saveResult = await saveEventsForCalendar(calendar.id, appEvents, removedEventIds);
      console.log(`  💾 Save result: ${saveResult.deleted} deleted, ${saveResult.added} added to DB`);

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

  const duration = Date.now() - syncStartTime;
  
  log.info('Sync complete', { totalAdded, totalUpdated, totalRemoved, duration });

  if (errors.length > 0) {
    log.warn(`${errors.length} calendar(s) failed to sync`);
  }

  // Track analytics
  analytics.syncCompleted({ duration, added: totalAdded, updated: totalUpdated, removed: totalRemoved });

  return {
    success: errors.length === 0,
    added: totalAdded,
    updated: totalUpdated,
    removed: totalRemoved,
    errors
  };
}

/**
 * Get events from database (filtered by date range)
 */
export async function getEvents(dateRange?: { start: Date; end: Date }): Promise<SyncableEvent[]> {
  const allEvents = await db.events.toArray();

  if (!dateRange) {
    // Convert string dates back to Date objects (in case they were stored as strings)
    return allEvents.map(event => ({
      ...event,
      startTime: event.startTime instanceof Date ? event.startTime : new Date(event.startTime),
      endTime: event.endTime instanceof Date ? event.endTime : new Date(event.endTime)
    }));
  }

  // Filter by date range
  return allEvents.filter(event => {
    const start = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    return start >= dateRange.start && start <= dateRange.end;
  });
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
