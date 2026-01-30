/**
 * Unit tests for duplicate detection logic
 */

import { describe, it, expect } from 'vitest';
import { detectDuplicates, areDuplicates } from './duplicate-detection';
import type { SyncableEvent } from '@/types';

// Helper to create test events
function createEvent(overrides: Partial<SyncableEvent>): SyncableEvent {
  return {
    id: 'test-id',
    title: 'Test Event',
    startTime: new Date('2026-01-30T10:00:00'),
    endTime: new Date('2026-01-30T11:00:00'),
    ...overrides,
  } as SyncableEvent;
}

describe('detectDuplicates', () => {
  it('should detect duplicate by googleEventId', () => {
    const existing = [
      createEvent({
        id: 'local-uuid-123',
        googleEventId: 'google-abc-123',
        title: 'Test Event',
      }),
    ];

    const incoming = [
      createEvent({
        id: 'primary:google-abc-123', // Google format
        googleEventId: 'google-abc-123',
        title: 'Test Event',
      }),
    ];

    const result = detectDuplicates(existing, incoming);

    expect(result.duplicatesFound).toHaveLength(1);
    expect(result.eventsToDelete).toHaveLength(1);
    expect(result.eventsToDelete[0].id).toBe('local-uuid-123');
    expect(result.eventsToKeep).toHaveLength(1);
    expect(result.eventsToKeep[0].id).toBe('primary:google-abc-123');
  });

  it('should not flag different events as duplicates', () => {
    const existing = [
      createEvent({
        id: 'local-1',
        googleEventId: 'google-A',
        title: 'Event A',
      }),
    ];

    const incoming = [
      createEvent({
        id: 'primary:google-B',
        googleEventId: 'google-B',
        title: 'Event B',
      }),
    ];

    const result = detectDuplicates(existing, incoming);

    expect(result.duplicatesFound).toHaveLength(0);
    expect(result.eventsToDelete).toHaveLength(0);
    expect(result.eventsToKeep).toHaveLength(1);
  });

  it('should handle multiple duplicates', () => {
    const existing = [
      createEvent({ id: 'local-1', googleEventId: 'google-1' }),
      createEvent({ id: 'local-2', googleEventId: 'google-2' }),
      createEvent({ id: 'local-3', googleEventId: 'google-3' }),
    ];

    const incoming = [
      createEvent({ id: 'primary:google-1', googleEventId: 'google-1' }),
      createEvent({ id: 'primary:google-2', googleEventId: 'google-2' }),
    ];

    const result = detectDuplicates(existing, incoming);

    expect(result.duplicatesFound).toHaveLength(2);
    expect(result.eventsToDelete).toHaveLength(2);
    expect(result.eventsToKeep).toHaveLength(2);
    
    // local-3 should not be deleted (no matching incoming event)
    const deletedIds = result.eventsToDelete.map(e => e.id);
    expect(deletedIds).toContain('local-1');
    expect(deletedIds).toContain('local-2');
    expect(deletedIds).not.toContain('local-3');
  });

  it('should handle events without googleEventId', () => {
    const existing = [
      createEvent({
        id: 'local-only',
        // No googleEventId - local-only event
      }),
    ];

    const incoming = [
      createEvent({
        id: 'primary:google-123',
        googleEventId: 'google-123',
      }),
    ];

    const result = detectDuplicates(existing, incoming);

    // Local-only event should not be flagged as duplicate
    expect(result.duplicatesFound).toHaveLength(0);
    expect(result.eventsToDelete).toHaveLength(0);
  });

  it('should prefer incoming events over existing (source of truth)', () => {
    const existing = [
      createEvent({
        id: 'local-uuid',
        googleEventId: 'google-123',
        title: 'Old Title',
        startTime: new Date('2026-01-30T10:00:00'),
      }),
    ];

    const incoming = [
      createEvent({
        id: 'primary:google-123',
        googleEventId: 'google-123',
        title: 'Updated Title', // Google has newer data
        startTime: new Date('2026-01-30T14:00:00'),
      }),
    ];

    const result = detectDuplicates(existing, incoming);

    expect(result.eventsToKeep[0].title).toBe('Updated Title');
    expect(result.eventsToDelete[0].title).toBe('Old Title');
  });

  it('should handle empty arrays', () => {
    const result = detectDuplicates([], []);
    
    expect(result.eventsToKeep).toHaveLength(0);
    expect(result.eventsToDelete).toHaveLength(0);
    expect(result.duplicatesFound).toHaveLength(0);
  });

  it('should handle no duplicates found', () => {
    const existing = [
      createEvent({ id: 'local-1', googleEventId: 'google-1' }),
    ];

    const incoming = [
      createEvent({ id: 'primary:google-2', googleEventId: 'google-2' }),
    ];

    const result = detectDuplicates(existing, incoming);

    expect(result.duplicatesFound).toHaveLength(0);
    expect(result.eventsToDelete).toHaveLength(0);
    expect(result.eventsToKeep).toHaveLength(1);
  });

  it('should handle multiple incoming events with same googleId (edge case)', () => {
    const existing = [
      createEvent({ id: 'local-1', googleEventId: 'google-1' }),
    ];

    // This shouldn't happen in practice, but we should handle it
    const incoming = [
      createEvent({ id: 'primary:google-1', googleEventId: 'google-1' }),
      createEvent({ id: 'primary:google-1-dup', googleEventId: 'google-1' }),
    ];

    const result = detectDuplicates(existing, incoming);

    // Both incoming events should be kept (Google is source of truth)
    // Local duplicate should be marked for deletion
    expect(result.eventsToDelete).toHaveLength(1);
    expect(result.eventsToDelete[0].id).toBe('local-1');
    expect(result.eventsToKeep).toHaveLength(2);
  });
});

describe('areDuplicates', () => {
  it('should return true for events with same googleEventId', () => {
    const event1 = createEvent({ id: '1', googleEventId: 'google-123' });
    const event2 = createEvent({ id: '2', googleEventId: 'google-123' });

    expect(areDuplicates(event1, event2)).toBe(true);
  });

  it('should return false for events with different googleEventId', () => {
    const event1 = createEvent({ id: '1', googleEventId: 'google-123' });
    const event2 = createEvent({ id: '2', googleEventId: 'google-456' });

    expect(areDuplicates(event1, event2)).toBe(false);
  });

  it('should return false if either event lacks googleEventId', () => {
    const event1 = createEvent({ id: '1', googleEventId: 'google-123' });
    const event2 = createEvent({ id: '2' }); // No googleEventId

    expect(areDuplicates(event1, event2)).toBe(false);
    expect(areDuplicates(event2, event1)).toBe(false);
  });
});
