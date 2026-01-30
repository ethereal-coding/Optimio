/**
 * Zod validation schemas for Google Calendar API
 * Runtime type validation for API responses
 */

import { z } from 'zod';

// =============================================================================
// Helper Schemas
// =============================================================================

/**
 * Schema for event start/end datetime
 * Events can have either dateTime (timed events) or date (all-day events)
 */
export const eventDateTimeSchema = z.object({
  dateTime: z.string().datetime().optional(),
  date: z.string().optional(), // For all-day events
  timeZone: z.string().optional(),
});

export type EventDateTimeType = z.infer<typeof eventDateTimeSchema>;

/**
 * Schema for event attendees
 */
export const attendeeSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  responseStatus: z.enum(['needsAction', 'declined', 'tentative', 'accepted']).optional(),
  organizer: z.boolean().optional(),
  self: z.boolean().optional(),
});

export type AttendeeType = z.infer<typeof attendeeSchema>;

/**
 * Schema for event organizer
 */
export const organizerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  self: z.boolean().optional(),
});

export type OrganizerType = z.infer<typeof organizerSchema>;

// =============================================================================
// Main Event Schema
// =============================================================================

/**
 * Schema for Google Calendar Event
 * Comprehensive validation for all event fields
 */
export const GoogleEventSchema = z.object({
  // Required fields
  id: z.string(),
  
  // Event details
  summary: z.string().optional(), // Title
  description: z.string().optional(),
  location: z.string().optional(),
  
  // Timing (one of dateTime or date is required)
  start: eventDateTimeSchema,
  end: eventDateTimeSchema,
  
  // Styling
  colorId: z.string().optional(),
  
  // Recurrence
  recurrence: z.array(z.string()).optional(),
  recurringEventId: z.string().optional(),
  originalStartTime: eventDateTimeSchema.optional(),
  
  // Attendees
  attendees: z.array(attendeeSchema).optional(),
  
  // Organizer
  organizer: organizerSchema.optional(),
  
  // Metadata
  created: z.string().datetime().optional(),
  updated: z.string().datetime().optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
  
  // Identifiers
  etag: z.string().optional(),
  iCalUID: z.string().optional(),
  
  // Links
  htmlLink: z.string().url().optional(),
  hangoutLink: z.string().url().optional(),
  
  // Reminders
  reminders: z.object({
    useDefault: z.boolean(),
    overrides: z.array(z.object({
      method: z.enum(['email', 'popup']),
      minutes: z.number(),
    })).optional(),
  }).optional(),
  
  // Visibility
  visibility: z.enum(['default', 'public', 'private', 'confidential']).optional(),
  
  // Conference data (for Google Meet)
  conferenceData: z.object({
    conferenceId: z.string().optional(),
    conferenceSolution: z.object({
      key: z.object({ type: z.string() }),
      name: z.string(),
      iconUri: z.string().url(),
    }).optional(),
    entryPoints: z.array(z.object({
      entryPointType: z.enum(['video', 'phone', 'sip', 'more']),
      uri: z.string().url(),
      label: z.string().optional(),
    })).optional(),
  }).optional(),
});

export type GoogleEventType = z.infer<typeof GoogleEventSchema>;

// =============================================================================
// Calendar Schemas
// =============================================================================

/**
 * Schema for Google Calendar metadata
 */
export const GoogleCalendarSchema = z.object({
  id: z.string(),
  summary: z.string(), // Calendar name
  description: z.string().optional(),
  location: z.string().optional(),
  timeZone: z.string().optional(),
  etag: z.string().optional(),
  
  // Access
  accessRole: z.enum(['freeBusyReader', 'reader', 'writer', 'owner']).optional(),
  primary: z.boolean().optional(),
  selected: z.boolean().optional(),
  
  // Colors
  backgroundColor: z.string().optional(),
  foregroundColor: z.string().optional(),
  colorId: z.string().optional(),
  
  // Sharing
  summaryOverride: z.string().optional(),
  hidden: z.boolean().optional(),
  deleted: z.boolean().optional(),
});

export type GoogleCalendarType = z.infer<typeof GoogleCalendarSchema>;

/**
 * Schema for calendar list response
 */
export const GoogleCalendarListSchema = z.object({
  kind: z.string(),
  etag: z.string(),
  nextPageToken: z.string().optional(),
  nextSyncToken: z.string().optional(),
  items: z.array(GoogleCalendarSchema),
});

export type GoogleCalendarListType = z.infer<typeof GoogleCalendarListSchema>;

// =============================================================================
// Events List Schema
// =============================================================================

/**
 * Schema for events list response
 */
export const GoogleEventsListSchema = z.object({
  kind: z.string(),
  etag: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  updated: z.string().datetime().optional(),
  timeZone: z.string().optional(),
  accessRole: z.string().optional(),
  nextPageToken: z.string().optional(),
  nextSyncToken: z.string().optional(),
  items: z.array(GoogleEventSchema),
});

export type GoogleEventsListType = z.infer<typeof GoogleEventsListSchema>;

// =============================================================================
// Input Schemas (for creating/updating)
// =============================================================================

/**
 * Schema for creating a new event
 * All fields optional except start/end
 */
export const CreateEventInputSchema = z.object({
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: eventDateTimeSchema,
  end: eventDateTimeSchema,
  colorId: z.string().optional(),
  recurrence: z.array(z.string()).optional(),
  attendees: z.array(z.object({
    email: z.string().email(),
    displayName: z.string().optional(),
  })).optional(),
  reminders: z.object({
    useDefault: z.boolean(),
    overrides: z.array(z.object({
      method: z.enum(['email', 'popup']),
      minutes: z.number(),
    })).optional(),
  }).optional(),
  visibility: z.enum(['default', 'public', 'private', 'confidential']).optional(),
});

export type CreateEventInputType = z.infer<typeof CreateEventInputSchema>;

/**
 * Schema for updating an event
 * All fields optional for partial updates
 */
export const UpdateEventInputSchema = CreateEventInputSchema.partial();

export type UpdateEventInputType = z.infer<typeof UpdateEventInputSchema>;

// =============================================================================
// Error Response Schema
// =============================================================================

/**
 * Schema for Google API error responses
 */
export const GoogleApiErrorSchema = z.object({
  error: z.object({
    code: z.number(),
    message: z.string(),
    status: z.string(),
    details: z.array(z.object({
      '@type': z.string(),
      reason: z.string().optional(),
      domain: z.string().optional(),
      metadata: z.record(z.string()).optional(),
    })).optional(),
  }),
});

export type GoogleApiErrorType = z.infer<typeof GoogleApiErrorSchema>;
