import Dexie, { type Table } from 'dexie';
import type { CalendarEvent, Todo, Goal, Note } from '@/types';
import { logger } from './logger';

const log = logger('db');

/**
 * CLEAN REBUILD - Simple database schema with no version migrations
 * Single source of truth for all data
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Events with Google Calendar sync support
export interface SyncableEvent extends CalendarEvent {
  googleEventId?: string;
  calendarId: string; // Local calendar ID (always '1' for now)
  sourceCalendarId?: string; // Which Google Calendar this event came from (e.g., 'primary', 'user@gmail.com')
  lastSyncedAt?: string;
  etag?: string; // Google's version identifier
  syncStatus?: 'pending' | 'synced' | 'error';
}

// Todos (keep for future use)
export interface SyncableTodo extends Todo {
  googleTaskId?: string;
  lastSyncedAt?: string;
  syncStatus?: 'pending' | 'synced' | 'error';
}

// Goals (keep for future use)
export interface SyncableGoal extends Goal {
  lastSyncedAt?: string;
  syncStatus?: 'pending' | 'synced' | 'error';
}

// Notes (keep for future use)
export interface SyncableNote extends Note {
  lastSyncedAt?: string;
  syncStatus?: 'pending' | 'synced' | 'error';
}

// Google Calendar metadata
export interface GoogleCalendar {
  id: string; // Google Calendar ID (e.g., 'primary', 'user@gmail.com', 'holiday@group.v.calendar.google.com')
  summary: string; // Calendar name
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string; // 'owner', 'writer', 'reader'
  primary?: boolean; // True for user's primary calendar
  selected?: boolean; // Whether selected in Google Calendar UI
  enabled: number; // 1 = enabled, 0 = disabled (Dexie works better with numbers for indexing)
  userId: string; // Which user this calendar belongs to
  lastSyncedAt?: string;
}

// Calendar preferences (for storing which calendars are visible/enabled)
export interface CalendarPreference {
  id: string; // calendar ID
  summary: string;
  color?: string;
  enabled: number; // 1 or 0
  userId: string;
}

// Auth tokens
export interface AuthToken {
  id: string; // 'google'
  accessToken: string;
  expiresAt: number; // Unix timestamp
  scope: string;
}

// User profile
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  preferences: {
    theme: 'dark' | 'light' | 'auto';
    startOfWeek?: number;
    dateFormat?: string;
    timeFormat?: string;
    notifications?: boolean;
  };
  createdAt: Date;
}

// App settings
export interface AppSettings {
  id: string; // 'user-preferences'
  theme: 'dark' | 'light' | 'auto';
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  defaultCalendarView: 'day' | 'week' | 'month';
  timeFormat: '12h' | '24h';
  dateFormat: string;
  autoSync: boolean;
  syncInterval: number; // minutes
}

// Sync queue entry
export interface SyncQueueEntry {
  id?: number; // auto-increment
  entityType: 'event' | 'todo' | 'goal' | 'note';
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: object;
  timestamp: number;
  retryCount: number;
  conflictResolution: 'pending' | 'synced' | 'local-wins' | 'remote-wins';
  error?: string;
}

// Conflict entry
export interface Conflict {
  id?: number; // auto-increment
  entityType: 'event' | 'todo' | 'goal' | 'note';
  entityId: string;
  localVersion: Record<string, unknown> | unknown[] | unknown;
  remoteVersion: Record<string, unknown> | unknown[] | unknown;
  detectedAt: number;
  resolvedAt?: number;
  resolution?: 'pending' | 'local-wins' | 'remote-wins' | 'merge';
}

// Deleted items (Recycling Bin)
export interface DeletedEvent extends SyncableEvent {
  deletedAt: string;
  originalId: string;
}

export interface DeletedTodo extends SyncableTodo {
  deletedAt: string;
  originalId: string;
}

export interface DeletedGoal extends SyncableGoal {
  deletedAt: string;
  originalId: string;
}

export interface DeletedNote extends SyncableNote {
  deletedAt: string;
  originalId: string;
}

// Archived items (auto-archive after completion + 3 days)
export interface ArchivedTodo extends Omit<SyncableTodo, 'completedAt'> {
  archivedAt: string;
  completedAt: string;
  originalId: string;
}

export interface ArchivedGoal extends Omit<SyncableGoal, 'completedAt'> {
  archivedAt: string;
  completedAt: string;
  originalId: string;
}

// ============================================================================
// DATABASE CLASS
// ============================================================================

export class OptimioDB extends Dexie {
  // Core data tables
  events!: Table<SyncableEvent, string>;
  todos!: Table<SyncableTodo, string>;
  goals!: Table<SyncableGoal, string>;
  notes!: Table<SyncableNote, string>;

  // Google Calendar tables
  calendars!: Table<GoogleCalendar, string>;
  calendarPreferences!: Table<CalendarPreference, string>;

  // Auth & user tables
  authTokens!: Table<AuthToken, string>;
  users!: Table<User, string>;
  settings!: Table<AppSettings, string>;

  // Sync tables
  syncQueue!: Table<SyncQueueEntry, number>;
  conflicts!: Table<Conflict, number>;

  // Deleted items (Recycling Bin)
  deletedEvents!: Table<DeletedEvent, string>;
  deletedTodos!: Table<DeletedTodo, string>;
  deletedGoals!: Table<DeletedGoal, string>;
  deletedNotes!: Table<DeletedNote, string>;

  // Archived items
  archivedTodos!: Table<ArchivedTodo, string>;
  archivedGoals!: Table<ArchivedGoal, string>;

  constructor() {
    super('OptimioDB');

    // Schema version 1 - Original schema
    this.version(1).stores({
      // Events indexed by: id, startTime, endTime, googleEventId, calendarId, and sourceCalendarId
      events: 'id, startTime, endTime, googleEventId, calendarId, sourceCalendarId',

      // Todos, goals, notes (for future use)
      todos: 'id, dueDate, completed, priority, category, googleTaskId',
      goals: 'id, deadline, category',
      notes: 'id, updatedAt, createdAt, folder, *tags, isPinned, isFavorite',

      // Google Calendars - indexed by id, enabled (as number 0/1), and userId
      calendars: 'id, enabled, userId, primary',
      calendarPreferences: 'id, enabled, userId',

      // Auth and settings
      authTokens: 'id, expiresAt',
      users: 'id, email',
      settings: 'id',

      // Sync tables
      syncQueue: '++id, entityType, entityId, conflictResolution, timestamp',
      conflicts: '++id, entityType, entityId, detectedAt, resolvedAt'
    });

    // Schema version 2 - Added recycling bin tables
    this.version(2).stores({
      // Deleted items (Recycling Bin) - auto-increment id with deletedAt index
      deletedEvents: '++id, deletedAt, originalId',
      deletedTodos: '++id, deletedAt, originalId',
      deletedGoals: '++id, deletedAt, originalId',
      deletedNotes: '++id, deletedAt, originalId'
    });

    // Schema version 3 - Added archive tables
    this.version(3).stores({
      // Archived items - auto-increment id with archivedAt and completedAt index
      archivedTodos: '++id, archivedAt, completedAt, originalId',
      archivedGoals: '++id, archivedAt, completedAt, originalId'
    });
  }
}

// ============================================================================
// DATABASE INSTANCE & INITIALIZATION
// ============================================================================

// Create singleton instance
export const db = new OptimioDB();

/**
 * Initialize database with default settings
 */
export async function initializeDatabase() {
  try {
    // Check if settings exist
    const settings = await db.settings.get('user-preferences');

    if (!settings) {
      // Create default settings
      await db.settings.add({
        id: 'user-preferences',
        theme: 'dark',
        weekStartsOn: 1,
        defaultCalendarView: 'month',
        timeFormat: '12h',
        dateFormat: 'MMM dd, yyyy',
        autoSync: false,
        syncInterval: 15
      });

      log.info('✅ Default settings created');
    }

    log.info('✅ Database initialized');
  } catch (error) {
    log.error('❌ Failed to initialize database', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Clear all data (useful for debugging/reset)
 */
export async function clearAllData() {
  try {
    await Promise.all([
      db.events.clear(),
      db.todos.clear(),
      db.goals.clear(),
      db.notes.clear(),
      db.calendars.clear(),
      db.calendarPreferences.clear(),
      db.authTokens.clear(),
      db.users.clear(),
      db.syncQueue.clear(),
      db.conflicts.clear(),
      db.deletedEvents.clear(),
      db.deletedTodos.clear(),
      db.deletedGoals.clear(),
      db.deletedNotes.clear(),
      db.archivedTodos.clear(),
      db.archivedGoals.clear()
      // Don't clear settings
    ]);

    log.info('✅ All data cleared');
  } catch (error) {
    log.error('❌ Failed to clear data', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get database health information
 */
export async function getDatabaseHealth(): Promise<{
  healthy: boolean;
  eventCount: number;
  todoCount: number;
  goalCount: number;
  noteCount: number;
  calendarCount: number;
}> {
  try {
    const [events, todos, goals, notes, calendars] = await Promise.all([
      db.events.count(),
      db.todos.count(),
      db.goals.count(),
      db.notes.count(),
      db.calendars.count()
    ]);

    return {
      healthy: true,
      eventCount: events,
      todoCount: todos,
      goalCount: goals,
      noteCount: notes,
      calendarCount: calendars
    };
  } catch (error) {
    log.error('Database health check failed', error instanceof Error ? error : new Error(String(error)));
    return {
      healthy: false,
      eventCount: 0,
      todoCount: 0,
      goalCount: 0,
      noteCount: 0,
      calendarCount: 0
    };
  }
}
