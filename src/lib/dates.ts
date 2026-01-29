import { parseISO, formatISO, isValid } from 'date-fns';

/**
 * Always store dates as ISO 8601 strings with timezone
 * This ensures compatibility with Google Calendar API and prevents timezone bugs
 */

/**
 * Convert a Date object to ISO 8601 string with timezone
 * @param date - Date object to convert
 * @returns ISO 8601 string (e.g., "2026-01-30T14:30:00-05:00")
 */
export function serializeDate(date: Date): string {
  if (!isValid(date)) {
    throw new Error(`Invalid date object: ${date}`);
  }
  return formatISO(date);
}

/**
 * Parse an ISO 8601 string back to Date object
 * @param isoString - ISO 8601 string
 * @returns Date object in user's local timezone
 */
export function deserializeDate(isoString: string): Date {
  try {
    const date = parseISO(isoString);
    if (!isValid(date)) {
      throw new Error(`Invalid ISO date string: ${isoString}`);
    }
    return date;
  } catch (error) {
    console.error('Failed to parse date:', isoString, error);
    // Fallback to current date to prevent crashes
    return new Date();
  }
}

/**
 * Format date for display using user's locale
 * @param isoString - ISO 8601 string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function displayDate(
  isoString: string,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = deserializeDate(isoString);
    return new Intl.DateTimeFormat(undefined, options).format(date);
  } catch (error) {
    console.error('Failed to format date:', isoString, error);
    return 'Invalid Date';
  }
}

/**
 * Format date for display (date only)
 * @param isoString - ISO 8601 string
 * @returns Formatted date string (e.g., "Jan 30, 2026")
 */
export function displayDateOnly(isoString: string): string {
  return displayDate(isoString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date for display (time only)
 * @param isoString - ISO 8601 string
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function displayTimeOnly(isoString: string): string {
  return displayDate(isoString, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format date for display (date + time)
 * @param isoString - ISO 8601 string
 * @returns Formatted datetime string (e.g., "Jan 30, 2026, 2:30 PM")
 */
export function displayDateTime(isoString: string): string {
  return displayDate(isoString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Check if a date string is valid
 * @param isoString - ISO 8601 string
 * @returns true if valid
 */
export function isValidDateString(isoString: string): boolean {
  try {
    const date = parseISO(isoString);
    return isValid(date);
  } catch {
    return false;
  }
}

/**
 * Get current timestamp as ISO string
 * @returns Current time as ISO 8601 string
 */
export function now(): string {
  return serializeDate(new Date());
}

/**
 * Convert legacy date formats to ISO 8601
 * Handles dates that might be stored as strings, timestamps, or Date objects
 * @param value - Any date-like value
 * @returns ISO 8601 string
 */
export function normalizeDate(value: any): string {
  // Already an ISO string
  if (typeof value === 'string' && isValidDateString(value)) {
    return value;
  }

  // Date object
  if (value instanceof Date) {
    return serializeDate(value);
  }

  // Timestamp (number)
  if (typeof value === 'number') {
    return serializeDate(new Date(value));
  }

  // String that needs parsing
  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      if (isValid(date)) {
        return serializeDate(date);
      }
    } catch {
      // Fall through to error
    }
  }

  console.error('Cannot normalize date:', value);
  return now(); // Fallback to current time
}

/**
 * Compare two date strings
 * @param a - First ISO 8601 string
 * @param b - Second ISO 8601 string
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareDates(a: string, b: string): number {
  const dateA = deserializeDate(a);
  const dateB = deserializeDate(b);
  return dateA.getTime() - dateB.getTime();
}

/**
 * Get start of day for a date string
 * @param isoString - ISO 8601 string
 * @returns ISO 8601 string at 00:00:00
 */
export function startOfDay(isoString: string): string {
  const date = deserializeDate(isoString);
  date.setHours(0, 0, 0, 0);
  return serializeDate(date);
}

/**
 * Get end of day for a date string
 * @param isoString - ISO 8601 string
 * @returns ISO 8601 string at 23:59:59
 */
export function endOfDay(isoString: string): string {
  const date = deserializeDate(isoString);
  date.setHours(23, 59, 59, 999);
  return serializeDate(date);
}
