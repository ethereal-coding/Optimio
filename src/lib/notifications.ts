/**
 * Toast notification system
 * Provides user feedback for actions and events
 */

import { toast, type ExternalToast } from 'sonner';

export interface NotificationOptions extends ExternalToast {
  /** Duration in milliseconds (default: 4000 for success, 6000 for error) */
  duration?: number;
}

/**
 * Show a success toast notification
 */
export function success(message: string, options?: NotificationOptions): string {
  return toast.success(message, {
    duration: 4000,
    ...options,
  });
}

/**
 * Show an error toast notification
 */
export function error(message: string, options?: NotificationOptions): string {
  return toast.error(message, {
    duration: 6000,
    ...options,
  });
}

/**
 * Show an info toast notification
 */
export function info(message: string, options?: NotificationOptions): string {
  return toast.info(message, {
    duration: 4000,
    ...options,
  });
}

/**
 * Show a warning toast notification
 */
export function warning(message: string, options?: NotificationOptions): string {
  return toast.warning(message, {
    duration: 5000,
    ...options,
  });
}

/**
 * Show a loading toast notification
 * Returns the toast ID for later dismissal or update
 */
export function loading(message: string): string {
  return toast.loading(message, {
    duration: Infinity,
  });
}

/**
 * Dismiss a specific toast by ID, or all toasts if no ID provided
 */
export function dismiss(toastId?: string): void {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
}

/**
 * Update an existing toast
 */
export function update(toastId: string, message: string, options?: NotificationOptions): void {
  toast.success(message, {
    id: toastId,
    ...options,
  });
}

// =============================================================================
// Specific Action Notifications
// =============================================================================

/**
 * Show notification when calendar event is created
 */
export function eventCreated(eventName?: string): string {
  return success(eventName ? `Created "${eventName}"` : 'Event created', {
    description: 'Synced to Google Calendar',
    icon: '📅',
  });
}

/**
 * Show notification when calendar event is updated
 */
export function eventUpdated(eventName?: string): string {
  return success(eventName ? `Updated "${eventName}"` : 'Event updated', {
    icon: '✏️',
  });
}

/**
 * Show notification when calendar event is deleted
 */
export function eventDeleted(eventName?: string): string {
  return success(eventName ? `Deleted "${eventName}"` : 'Event deleted', {
    icon: '🗑️',
  });
}

/**
 * Show loading notification when sync starts
 * Returns toast ID for tracking
 */
export function syncStarted(): string {
  return loading('Syncing with Google Calendar...');
}

/**
 * Show notification when sync completes successfully
 */
export function syncCompleted(eventCount?: number): void {
  dismiss(); // Dismiss loading toast
  success('Sync complete', {
    description: eventCount 
      ? `Updated ${eventCount} events` 
      : 'All calendars up to date',
    icon: '☁️',
  });
}

/**
 * Show notification when sync fails
 * Optionally includes a retry button
 */
export function syncFailed(retryCallback?: () => void): void {
  dismiss(); // Dismiss loading toast
  error('Sync failed', {
    description: retryCallback 
      ? 'Click to retry manually' 
      : 'Will retry automatically',
    duration: 8000,
    action: retryCallback 
      ? { 
          label: 'Retry', 
          onClick: retryCallback,
        } 
      : undefined,
  });
}

/**
 * Show notification on successful authentication
 */
export function authSuccess(provider: string = 'Google'): string {
  return success(`Signed in with ${provider}`, {
    description: 'Welcome back!',
    icon: '🔐',
  });
}

/**
 * Show notification on authentication error
 */
export function authError(reason?: string): string {
  return error('Sign in failed', {
    description: reason || 'Please try again',
    icon: '🔒',
  });
}

/**
 * Show notification when todo is created
 */
export function todoCreated(): string {
  return success('Task added', {
    icon: '✅',
  });
}

/**
 * Show notification when todo is completed
 */
export function todoCompleted(): string {
  return success('Task completed', {
    icon: '🎉',
  });
}

/**
 * Show notification for generic save operations
 */
export function saved(entity: string = 'Changes'): string {
  return success(`${entity} saved`, {
    icon: '💾',
  });
}

// =============================================================================
// Promise-based Notifications
// =============================================================================

interface PromiseOptions<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: Error) => string);
}

/**
 * Wrap a promise with loading/success/error toasts
 * Automatically handles state transitions
 */
export function promise<T>(
  promise: Promise<T>,
  options: PromiseOptions<T>
): Promise<T> {
  return toast.promise(promise, {
    loading: options.loading,
    success: options.success,
    error: options.error,
  });
}

// =============================================================================
// Default Export
// =============================================================================

export const notify = {
  success,
  error,
  info,
  warning,
  loading,
  dismiss,
  update,
  eventCreated,
  eventUpdated,
  eventDeleted,
  syncStarted,
  syncCompleted,
  syncFailed,
  authSuccess,
  authError,
  todoCreated,
  todoCompleted,
  saved,
  promise,
};

export default notify;
