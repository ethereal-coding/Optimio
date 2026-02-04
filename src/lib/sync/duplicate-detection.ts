/**
 * Pure function for detecting duplicate events by googleEventId
 * Google Calendar is the source of truth - incoming events take precedence
 */

import type { SyncableEvent } from '@/lib/db';

export interface DuplicateDetectionResult {
  /** Events to keep (incoming events from Google) */
  eventsToKeep: SyncableEvent[];
  /** Events to delete (local duplicates) */
  eventsToDelete: SyncableEvent[];
  /** Metadata about found duplicates for logging/debugging */
  duplicatesFound: Array<{
    keep: SyncableEvent;
    remove: SyncableEvent;
    reason: 'same_google_id';
  }>;
}

/**
 * Detect duplicate events between existing (local) and incoming (from Google) events
 * 
 * @param existingEvents - Events currently in the local database
 * @param incomingEvents - Events fetched from Google Calendar
 * @returns Object containing events to keep, delete, and duplicate metadata
 */
export function detectDuplicates(
  existingEvents: SyncableEvent[],
  incomingEvents: SyncableEvent[]
): DuplicateDetectionResult {
  // Index existing events by googleEventId for O(1) lookup
  const existingByGoogleId = new Map<string, SyncableEvent>();
  
  for (const event of existingEvents) {
    if (event.googleEventId) {
      existingByGoogleId.set(event.googleEventId, event);
    }
  }

  const eventsToDelete: SyncableEvent[] = [];
  const duplicatesFound: DuplicateDetectionResult['duplicatesFound'] = [];
  const processedGoogleIds = new Set<string>();

  // Process incoming events
  for (const incoming of incomingEvents) {
    if (!incoming.googleEventId) {
      // Skip events without googleEventId (shouldn't happen for Google events)
      continue;
    }

    // Track that we've processed this Google ID
    processedGoogleIds.add(incoming.googleEventId);

    // Check if there's an existing event with the same googleEventId
    const existing = existingByGoogleId.get(incoming.googleEventId);
    
    if (existing && existing.id !== incoming.id) {
      // Duplicate found - mark existing (local) for deletion
      // Keep the incoming event (Google is source of truth)
      // Only add to delete list if not already added
      if (!eventsToDelete.some(e => e.id === existing.id)) {
        eventsToDelete.push(existing);
      }
      duplicatesFound.push({
        keep: incoming,
        remove: existing,
        reason: 'same_google_id',
      });
    }
  }

  // Events to keep are the incoming events (Google is source of truth)
  // We don't need to filter - all incoming events should be kept
  const eventsToKeep = incomingEvents;

  return {
    eventsToKeep,
    eventsToDelete,
    duplicatesFound,
  };
}

/**
 * Utility to check if two events are duplicates
 */
export function areDuplicates(event1: SyncableEvent, event2: SyncableEvent): boolean {
  // Must have the same googleEventId to be duplicates
  if (!event1.googleEventId || !event2.googleEventId) {
    return false;
  }
  
  return event1.googleEventId === event2.googleEventId;
}
