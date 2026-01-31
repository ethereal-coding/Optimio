/**
 * Google Calendar API Client
 * Centralized, type-safe client with retries and error handling
 */

import { z } from 'zod';
import { 
  GoogleEventSchema, 
  GoogleCalendarListSchema,
  type GoogleEventType,
  type GoogleCalendarListType,
  type CreateEventInputType,
  type UpdateEventInputType,
} from '@/schemas/google-calendar';
import { logger } from '@/lib/logger';

const log = logger('google-calendar-client');

// =============================================================================
// Error Classes
// =============================================================================

export class GoogleCalendarError extends Error {
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GoogleCalendarError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class GoogleCalendarAuthError extends GoogleCalendarError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'GoogleCalendarAuthError';
  }
}

export class GoogleCalendarNotFoundError extends GoogleCalendarError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'GoogleCalendarNotFoundError';
  }
}

export class GoogleCalendarRateLimitError extends GoogleCalendarError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT');
    this.name = 'GoogleCalendarRateLimitError';
  }
}

export class GoogleCalendarNetworkError extends GoogleCalendarError {
  constructor(message = 'Network error') {
    super(message, 503, 'NETWORK_ERROR');
    this.name = 'GoogleCalendarNetworkError';
  }
}

// =============================================================================
// Types
// =============================================================================

interface FetchEventsOptions {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  pageToken?: string;
  syncToken?: string;
  showDeleted?: boolean;
}

interface GoogleCalendarClientConfig {
  baseUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  getAccessToken: () => Promise<string | null>;
}

// =============================================================================
// Client Class
// =============================================================================

export class GoogleCalendarClient {
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;
  private getAccessToken: () => Promise<string | null>;

  constructor(config: GoogleCalendarClientConfig) {
    this.baseUrl = config.baseUrl || 'https://www.googleapis.com/calendar/v3';
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.getAccessToken = config.getAccessToken;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<Response> {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new GoogleCalendarAuthError('No access token available');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    log.debug(`API Request: ${options.method || 'GET'} ${endpoint}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle rate limiting with retry
      if (response.status === 429 && retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        log.warn(`Rate limited, retrying in ${delay}ms`);
        await this.sleep(delay);
        return this.fetchWithAuth(endpoint, options, retryCount + 1);
      }

      // Handle auth errors
      if (response.status === 401) {
        throw new GoogleCalendarAuthError('Access token expired or invalid');
      }

      // Handle not found
      if (response.status === 404) {
        throw new GoogleCalendarNotFoundError(endpoint);
      }

      // Handle other errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new GoogleCalendarError(
          `API request failed: ${errorText}`,
          response.status
        );
      }

      return response;
    } catch (error) {
      // Network errors - retry
      if (error instanceof TypeError && retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        log.warn(`Network error, retrying in ${delay}ms`);
        await this.sleep(delay);
        return this.fetchWithAuth(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // Public API Methods
  // ===========================================================================

  /**
   * Fetch events from a calendar
   */
  async fetchEvents(
    calendarId: string,
    options: FetchEventsOptions = {}
  ): Promise<{ events: GoogleEventType[]; nextPageToken?: string; nextSyncToken?: string }> {
    const params = new URLSearchParams();
    
    if (options.timeMin) params.set('timeMin', options.timeMin);
    if (options.timeMax) params.set('timeMax', options.timeMax);
    if (options.maxResults) params.set('maxResults', options.maxResults.toString());
    if (options.pageToken) params.set('pageToken', options.pageToken);
    if (options.syncToken) params.set('syncToken', options.syncToken);
    if (options.showDeleted) params.set('showDeleted', 'true');
    
    params.set('singleEvents', 'true');
    params.set('orderBy', 'startTime');

    const queryString = params.toString();
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events${queryString ? `?${queryString}` : ''}`;

    const response = await this.fetchWithAuth(endpoint);
    const data = await response.json();

    // Validate response with Zod
    const events = z.array(GoogleEventSchema).parse(data.items || []);

    log.info(`Fetched ${events.length} events from calendar ${calendarId}`);

    return {
      events,
      nextPageToken: data.nextPageToken,
      nextSyncToken: data.nextSyncToken,
    };
  }

  /**
   * Fetch a single event
   */
  async fetchEvent(calendarId: string, eventId: string): Promise<GoogleEventType> {
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
    
    const response = await this.fetchWithAuth(endpoint);
    const data = await response.json();

    return GoogleEventSchema.parse(data);
  }

  /**
   * Create a new event
   */
  async createEvent(
    calendarId: string,
    event: CreateEventInputType
  ): Promise<GoogleEventType> {
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events`;
    
    log.info('Creating event', { summary: event.summary });

    const response = await this.fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(event),
    });

    const data = await response.json();
    const createdEvent = GoogleEventSchema.parse(data);

    log.info('Event created', { eventId: createdEvent.id });

    return createdEvent;
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    event: UpdateEventInputType
  ): Promise<GoogleEventType> {
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
    
    log.info('Updating event', { eventId });

    const response = await this.fetchWithAuth(endpoint, {
      method: 'PUT',
      body: JSON.stringify(event),
    });

    const data = await response.json();
    const updatedEvent = GoogleEventSchema.parse(data);

    log.info('Event updated', { eventId: updatedEvent.id });

    return updatedEvent;
  }

  /**
   * Delete an event
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
    
    log.info('Deleting event', { eventId });

    await this.fetchWithAuth(endpoint, {
      method: 'DELETE',
    });

    log.info('Event deleted', { eventId });
  }

  /**
   * Fetch list of user's calendars
   */
  async fetchCalendarList(): Promise<GoogleCalendarListType> {
    const endpoint = '/users/me/calendarList';
    
    const response = await this.fetchWithAuth(endpoint);
    const data = await response.json();

    const parsed = GoogleCalendarListSchema.parse(data);

    log.info(`Fetched ${parsed.items.length} calendars`);

    return parsed;
  }

  /**
   * Get a specific calendar's metadata
   */
  async fetchCalendar(calendarId: string): Promise<GoogleCalendarListType['items'][0]> {
    const endpoint = `/users/me/calendarList/${encodeURIComponent(calendarId)}`;
    
    const response = await this.fetchWithAuth(endpoint);
    const data = await response.json();

    // Validate as a single calendar item
    const calendar = GoogleCalendarListSchema.shape.items.element.parse(data);

    return calendar;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let clientInstance: GoogleCalendarClient | null = null;

export function createGoogleCalendarClient(
  config: GoogleCalendarClientConfig
): GoogleCalendarClient {
  return new GoogleCalendarClient(config);
}

export function getGoogleCalendarClient(
  config: GoogleCalendarClientConfig
): GoogleCalendarClient {
  if (!clientInstance) {
    clientInstance = createGoogleCalendarClient(config);
  }
  return clientInstance;
}

export function resetGoogleCalendarClient(): void {
  clientInstance = null;
}

export default GoogleCalendarClient;
