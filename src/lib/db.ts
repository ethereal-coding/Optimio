import Dexie, { type Table } from 'dexie';
import type { CalendarEvent, Todo, Goal, Note } from '@/types';

// Extend types with sync fields
export interface SyncableEvent extends CalendarEvent {
  googleEventId?: string;
  syncStatus?: 'pending' | 'synced' | 'conflict' | 'error';
  lastSyncedAt?: string;
}

export interface SyncableTodo extends Todo {
  googleTaskId?: string;
  syncStatus?: 'pending' | 'synced' | 'conflict' | 'error';
  lastSyncedAt?: string;
}

export interface SyncableGoal extends Goal {
  syncStatus?: 'pending' | 'synced' | 'conflict' | 'error';
  lastSyncedAt?: string;
}

export interface SyncableNote extends Note {
  syncStatus?: 'pending' | 'synced' | 'conflict' | 'error';
  lastSyncedAt?: string;
}

// Sync Queue Entry
export interface SyncQueueEntry {
  id?: number;
  entityType: 'event' | 'todo' | 'goal' | 'note';
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: number;
  retryCount: number;
  conflictResolution?: 'local-wins' | 'remote-wins' | 'merge' | 'pending';
  error?: string;
}

// Conflict Entry
export interface ConflictEntry {
  id?: number;
  entityType: 'event' | 'todo' | 'goal' | 'note';
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  detectedAt: number;
  resolvedAt?: number;
  resolution?: 'local-wins' | 'remote-wins' | 'merge';
}

// Auth Tokens
export interface AuthToken {
  id: string; // 'google'
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

// Settings
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

// Database Interface
export class OptimioDB extends Dexie {
  events!: Table<SyncableEvent, string>;
  todos!: Table<SyncableTodo, string>;
  goals!: Table<SyncableGoal, string>;
  notes!: Table<SyncableNote, string>;
  syncQueue!: Table<SyncQueueEntry, number>;
  conflicts!: Table<ConflictEntry, number>;
  authTokens!: Table<AuthToken, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('OptimioDB');

    this.version(1).stores({
      // Primary data tables with sync metadata
      events: 'id, startTime, endTime, googleEventId, syncStatus, lastSyncedAt',
      todos: 'id, dueDate, completed, priority, category, googleTaskId, syncStatus, lastSyncedAt',
      goals: 'id, deadline, category, syncStatus, lastSyncedAt',
      notes: 'id, updatedAt, createdAt, folder, *tags, isPinned, isFavorite, syncStatus, lastSyncedAt',

      // Sync infrastructure
      syncQueue: '++id, entityType, entityId, operation, timestamp, retryCount, conflictResolution',
      conflicts: '++id, entityType, entityId, detectedAt, resolvedAt',

      // Auth and settings
      authTokens: 'id, expiresAt',
      settings: 'id'
    });
  }
}

// Create singleton instance
export const db = new OptimioDB();

// Initialize with default settings
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
    }

    console.log('✅ Optimio Database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

// Migration helper for existing users
export async function migrateFromLocalStorage() {
  try {
    const migrationFlag = localStorage.getItem('optimio-migrated-to-indexeddb');

    if (migrationFlag) {
      console.log('✅ Already migrated to IndexedDB');
      return false;
    }

    // Check if there's legacy data in localStorage
    const legacyState = localStorage.getItem('optimio-legacy-state');

    if (legacyState) {
      const data = JSON.parse(legacyState);

      // Migrate events
      if (data.events && data.events.length > 0) {
        await db.events.bulkAdd(
          data.events.map((e: any) => ({
            ...e,
            syncStatus: 'pending' as const
          }))
        );
        console.log(`✅ Migrated ${data.events.length} events`);
      }

      // Migrate todos
      if (data.todos && data.todos.length > 0) {
        await db.todos.bulkAdd(
          data.todos.map((t: any) => ({
            ...t,
            syncStatus: 'pending' as const
          }))
        );
        console.log(`✅ Migrated ${data.todos.length} todos`);
      }

      // Migrate goals
      if (data.goals && data.goals.length > 0) {
        await db.goals.bulkAdd(
          data.goals.map((g: any) => ({
            ...g,
            syncStatus: 'pending' as const
          }))
        );
        console.log(`✅ Migrated ${data.goals.length} goals`);
      }

      // Migrate notes
      if (data.notes && data.notes.length > 0) {
        await db.notes.bulkAdd(
          data.notes.map((n: any) => ({
            ...n,
            syncStatus: 'pending' as const
          }))
        );
        console.log(`✅ Migrated ${data.notes.length} notes`);
      }

      localStorage.setItem('optimio-migrated-to-indexeddb', 'true');
      console.log('✅ Migration complete!');
      return true;
    }

    // No legacy data, just mark as migrated
    localStorage.setItem('optimio-migrated-to-indexeddb', 'true');
    return false;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Helper to check database health
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  eventCount: number;
  todoCount: number;
  goalCount: number;
  noteCount: number;
  pendingSyncCount: number;
  conflictCount: number;
}> {
  try {
    const [events, todos, goals, notes, syncQueue] = await Promise.all([
      db.events.count(),
      db.todos.count(),
      db.goals.count(),
      db.notes.count(),
      db.syncQueue.where('operation').notEqual('SYNCED').count()
    ]);

    // Count unresolved conflicts (where resolvedAt is null/undefined)
    const conflicts = await db.conflicts.filter(c => !c.resolvedAt).count();

    return {
      healthy: true,
      eventCount: events,
      todoCount: todos,
      goalCount: goals,
      noteCount: notes,
      pendingSyncCount: syncQueue,
      conflictCount: conflicts
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      healthy: false,
      eventCount: 0,
      todoCount: 0,
      goalCount: 0,
      noteCount: 0,
      pendingSyncCount: 0,
      conflictCount: 0
    };
  }
}
