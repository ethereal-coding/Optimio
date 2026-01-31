/**
 * Toast notification system
 * Provides user feedback for actions and events
 * Styled to match Optimio's card-based design
 */

import { toast, type ExternalToast } from 'sonner';

export interface NotificationOptions extends ExternalToast {
  /** Duration in milliseconds (default: 4000 for success, 6000 for error) */
  duration?: number;
}

// =============================================================================
// Base Notifications
// =============================================================================

/**
 * Show a success toast notification
 */
export function success(message: string, options?: NotificationOptions): string {
  return toast.success(message, {
    duration: 4000,
    ...options,
  }) as string;
}

/**
 * Show an error toast notification
 */
export function error(message: string, options?: NotificationOptions): string {
  return toast.error(message, {
    duration: 6000,
    ...options,
  }) as string;
}

/**
 * Show an info toast notification
 */
export function info(message: string, options?: NotificationOptions): string {
  return toast.info(message, {
    duration: 4000,
    ...options,
  }) as string;
}

/**
 * Show a warning toast notification
 */
export function warning(message: string, options?: NotificationOptions): string {
  return toast.warning(message, {
    duration: 5000,
    ...options,
  }) as string;
}

/**
 * Show a loading toast notification
 * Returns the toast ID for later dismissal or update
 */
export function loading(message: string): string {
  return toast.loading(message, {
    duration: Infinity,
  }) as string;
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
// Calendar Event Notifications
// =============================================================================

/**
 * Show notification when calendar event is created
 */
export function eventCreated(eventName?: string): string {
  return success(eventName ? `"${eventName}" created` : 'Event created', {
    description: 'Synced to Google Calendar',
  });
}

/**
 * Show notification when calendar event is updated
 */
export function eventUpdated(eventName?: string): string {
  return success(eventName ? `"${eventName}" updated` : 'Event updated', {
    description: 'Changes synced',
  });
}

/**
 * Show notification when calendar event is deleted
 */
export function eventDeleted(eventName?: string): string {
  return success(eventName ? `"${eventName}" deleted` : 'Event deleted', {
    description: 'Removed from calendar',
  });
}

// =============================================================================
// Todo Notifications
// =============================================================================

/**
 * Show notification when todo is created
 */
export function todoCreated(todoTitle?: string): string {
  return success(todoTitle ? `"${todoTitle}" added` : 'Task added', {
    description: 'Ready to tackle',
  });
}

/**
 * Show notification when todo is updated
 */
export function todoUpdated(todoTitle?: string): string {
  return success(todoTitle ? `"${todoTitle}" updated` : 'Task updated');
}

/**
 * Show notification when todo is deleted
 */
export function todoDeleted(todoTitle?: string): string {
  return success(todoTitle ? `"${todoTitle}" deleted` : 'Task deleted');
}

/**
 * Show notification when todo is completed
 */
export function todoCompleted(todoTitle?: string): string {
  return success(todoTitle ? `Completed "${todoTitle}"` : 'Task completed', {
    description: 'Great job! 🎉',
  });
}

/**
 * Show notification when todo is uncompleted
 */
export function todoUncompleted(todoTitle?: string): string {
  return info(todoTitle ? `"${todoTitle}" reopened` : 'Task reopened');
}

// =============================================================================
// Goal Notifications
// =============================================================================

/**
 * Show notification when goal is created
 */
export function goalCreated(goalTitle?: string): string {
  return success(goalTitle ? `"${goalTitle}" created` : 'Goal created', {
    description: 'Let\'s achieve it! 🎯',
  });
}

/**
 * Show notification when goal is updated
 */
export function goalUpdated(goalTitle?: string): string {
  return success(goalTitle ? `"${goalTitle}" updated` : 'Goal updated');
}

/**
 * Show notification when goal is deleted
 */
export function goalDeleted(goalTitle?: string): string {
  return success(goalTitle ? `"${goalTitle}" deleted` : 'Goal deleted');
}

/**
 * Show notification when goal progress is updated
 */
export function goalProgressUpdated(goalTitle?: string, progress?: number): string {
  if (progress !== undefined && progress >= 100) {
    return success(goalTitle ? `"${goalTitle}" achieved!` : 'Goal achieved!', {
      description: 'You crushed it! 🏆',
      duration: 6000,
    });
  }
  return success(goalTitle ? `"${goalTitle}" progress updated` : 'Progress updated', {
    description: progress !== undefined ? `${Math.round(progress)}% complete` : undefined,
  });
}

/**
 * Show notification when milestone is completed
 */
export function milestoneCompleted(milestoneTitle?: string): string {
  return success(milestoneTitle ? `Milestone: "${milestoneTitle}"` : 'Milestone completed', {
    description: 'One step closer! 🚀',
  });
}

// =============================================================================
// Note Notifications
// =============================================================================

/**
 * Show notification when note is created
 */
export function noteCreated(noteTitle?: string): string {
  return success(noteTitle ? `"${noteTitle}" saved` : 'Note saved', {
    description: 'Captured for later',
  });
}

/**
 * Show notification when note is updated
 */
export function noteUpdated(noteTitle?: string): string {
  return success(noteTitle ? `"${noteTitle}" updated` : 'Note updated', {
    description: 'Changes saved',
  });
}

/**
 * Show notification when note is deleted
 */
export function noteDeleted(noteTitle?: string): string {
  return success(noteTitle ? `"${noteTitle}" deleted` : 'Note deleted');
}

/**
 * Show notification when note is pinned
 */
export function notePinned(noteTitle?: string): string {
  return info(noteTitle ? `"${noteTitle}" pinned` : 'Note pinned', {
    description: 'Now at the top',
  });
}

/**
 * Show notification when note is unpinned
 */
export function noteUnpinned(noteTitle?: string): string {
  return info(noteTitle ? `"${noteTitle}" unpinned` : 'Note unpinned');
}

/**
 * Show notification when note is favorited
 */
export function noteFavorited(noteTitle?: string): string {
  return success(noteTitle ? `"${noteTitle}" added to favorites` : 'Added to favorites');
}

/**
 * Show notification when note is unfavorited
 */
export function noteUnfavorited(noteTitle?: string): string {
  return info(noteTitle ? `"${noteTitle}" removed from favorites` : 'Removed from favorites');
}

// =============================================================================
// Sync Notifications
// =============================================================================

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
 * Show notification when data is saved locally
 */
export function savedLocally(entity?: string): string {
  return success(entity ? `${entity} saved` : 'Saved', {
    description: 'Stored locally',
  });
}

// =============================================================================
// Auth Notifications
// =============================================================================

/**
 * Show notification on successful authentication
 */
export function authSuccess(provider: string = 'Google'): string {
  return success(`Signed in with ${provider}`, {
    description: 'Welcome back!',
  });
}

/**
 * Show notification on authentication error
 */
export function authError(reason?: string): string {
  return error('Sign in failed', {
    description: reason || 'Please try again',
  });
}

/**
 * Show notification on sign out
 */
export function authSignedOut(): string {
  return info('Signed out', {
    description: 'See you soon!',
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
  }) as unknown as Promise<T>;
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
  // Calendar
  eventCreated,
  eventUpdated,
  eventDeleted,
  // Todos
  todoCreated,
  todoUpdated,
  todoDeleted,
  todoCompleted,
  todoUncompleted,
  // Goals
  goalCreated,
  goalUpdated,
  goalDeleted,
  goalProgressUpdated,
  milestoneCompleted,
  // Notes
  noteCreated,
  noteUpdated,
  noteDeleted,
  notePinned,
  noteUnpinned,
  noteFavorited,
  noteUnfavorited,
  // Sync
  syncStarted,
  syncCompleted,
  syncFailed,
  savedLocally,
  // Auth
  authSuccess,
  authError,
  authSignedOut,
  promise,
};

export default notify;
