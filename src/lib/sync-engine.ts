/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { db, type SyncQueueEntry } from './db';
import { now } from './dates';
import { debug } from './debug';

/**
 * Sync Engine - Handles 2-way sync with Google APIs
 * This is a skeleton implementation that logs operations
 * Replace debug.log with actual API calls when backend is ready
 */

export interface SyncResult {
  success: boolean;
  synced: number;
  conflicts: number;
  errors: number;
  message: string;
}

/**
 * Queue a change for future sync
 * Called whenever user creates/updates/deletes an entity
 */
export async function queueSync(
  entityType: 'event' | 'todo' | 'goal' | 'note',
  entityId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: object
): Promise<void> {
  try {
    await db.syncQueue.add({
      entityType,
      entityId,
      operation,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      conflictResolution: 'pending' as const
    });

    debug.log(`📝 Queued ${operation} for ${entityType}:${entityId}`);
  } catch (error) {
    console.error('Failed to queue sync:', error);
  }
}

/**
 * Process sync queue
 * This runs periodically or when user clicks "Sync Now"
 */
export async function processSyncQueue(): Promise<SyncResult> {
  try {
    // Get all pending sync operations
    const pending = await db.syncQueue
      .where('conflictResolution')
      .notEqual('synced')
      .toArray();

    if (pending.length === 0) {
      return {
        success: true,
        synced: 0,
        conflicts: 0,
        errors: 0,
        message: 'Nothing to sync'
      };
    }

    debug.log(`🔄 Processing ${pending.length} pending sync operations`);

    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    for (const entry of pending) {
      try {
        // TODO: Replace with actual API call
        const result = await syncEntityToGoogle(entry);

        if (result.success) {
          // Mark as synced
          await db.syncQueue.update(entry.id!, {
            conflictResolution: 'local-wins' // Placeholder
          });
          synced++;
        } else if (result.conflict) {
          // Conflict detected
          await detectConflict(entry, result.remoteVersion);
          conflicts++;
        } else {
          // Error - increment retry count
          await db.syncQueue.update(entry.id!, {
            retryCount: entry.retryCount + 1,
            error: result.error
          });
          errors++;
        }
      } catch (error) {
        console.error(`Failed to sync ${entry.entityType}:${entry.entityId}`, error);
        errors++;
      }
    }

    return {
      success: errors === 0,
      synced,
      conflicts,
      errors,
      message: `Synced: ${synced}, Conflicts: ${conflicts}, Errors: ${errors}`
    };
  } catch (error) {
    console.error('Sync queue processing failed:', error);
    return {
      success: false,
      synced: 0,
      conflicts: 0,
      errors: 1,
      message: 'Sync failed'
    };
  }
}

/**
 * Sync a single entity to Google
 * Placeholder - replace with actual Google API calls
 */
async function syncEntityToGoogle(entry: SyncQueueEntry): Promise<{
  success: boolean;
  conflict?: boolean;
  remoteVersion?: Record<string, unknown>;
  error?: string;
}> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // TODO: Implement actual Google API calls
  // For events: Use Google Calendar API
  // For todos: Use Google Tasks API

  debug.log(`🌐 [MOCK] Syncing ${entry.operation} ${entry.entityType}:${entry.entityId}`);

  // Placeholder - always succeed for now
  return { success: true };
}

/**
 * Detect and record conflicts
 */
async function detectConflict(
  localChange: SyncQueueEntry,
  remoteVersion: Record<string, unknown>
): Promise<void> {
  try {
    // Get local version
    const localEntity = await getLocalEntity(
      localChange.entityType,
      localChange.entityId
    );

    if (!localEntity) {
      debug.warn('Local entity not found for conflict detection');
      return;
    }

    // Record conflict
    await db.conflicts.add({
      entityType: localChange.entityType,
      entityId: localChange.entityId,
      localVersion: localEntity,
      remoteVersion: remoteVersion,
      detectedAt: Date.now(),
      resolution: 'pending'
    });

    debug.log(`⚠️ Conflict detected for ${localChange.entityType}:${localChange.entityId}`);
  } catch (error) {
    console.error('Failed to record conflict:', error);
  }
}

/**
 * Get local entity from database
 */
async function getLocalEntity(
  entityType: 'event' | 'todo' | 'goal' | 'note',
  entityId: string
): Promise<Record<string, unknown> | null> {
  switch (entityType) {
    case 'event':
      return await db.events.get(entityId);
    case 'todo':
      return await db.todos.get(entityId);
    case 'goal':
      return await db.goals.get(entityId);
    case 'note':
      return await db.notes.get(entityId);
    default:
      return null;
  }
}

/**
 * Resolve a conflict with user's choice
 */
export async function resolveConflict(
  conflictId: number,
  resolution: 'local-wins' | 'remote-wins' | 'merge'
): Promise<void> {
  try {
    const conflict = await db.conflicts.get(conflictId);

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    // Apply resolution
    switch (resolution) {
      case 'local-wins':
        // Push local version to remote
        await queueSync(
          conflict.entityType,
          conflict.entityId,
          'UPDATE',
          conflict.localVersion
        );
        break;

      case 'remote-wins':
        // Update local with remote version
        await updateLocalEntity(
          conflict.entityType,
          conflict.entityId,
          conflict.remoteVersion
        );
        break;

      case 'merge': {
        // Custom merge logic (entity-specific)
        const merged = mergeEntities(conflict.localVersion, conflict.remoteVersion);
        await updateLocalEntity(conflict.entityType, conflict.entityId, merged);
        await queueSync(conflict.entityType, conflict.entityId, 'UPDATE', merged);
        break;
      }
    }

    // Mark conflict as resolved
    await db.conflicts.update(conflictId, {
      resolvedAt: Date.now(),
      resolution
    });

    debug.log(`✅ Conflict resolved: ${resolution}`);
  } catch (error) {
    console.error('Failed to resolve conflict:', error);
    throw error;
  }
}

/**
 * Update local entity in database
 */
async function updateLocalEntity(
  entityType: 'event' | 'todo' | 'goal' | 'note',
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  switch (entityType) {
    case 'event':
      await db.events.put({ ...data, id: entityId });
      break;
    case 'todo':
      await db.todos.put({ ...data, id: entityId });
      break;
    case 'goal':
      await db.goals.put({ ...data, id: entityId });
      break;
    case 'note':
      await db.notes.put({ ...data, id: entityId });
      break;
  }
}

/**
 * Merge two versions of an entity (simple strategy)
 */
function mergeEntities(local: Record<string, unknown>, remote: Record<string, unknown>): Record<string, unknown> {
  // Simple merge: use latest timestamp wins
  const localTime = new Date(local.updatedAt || local.createdAt).getTime();
  const remoteTime = new Date(remote.updatedAt || remote.createdAt).getTime();

  if (localTime > remoteTime) {
    return { ...remote, ...local };
  } else {
    return { ...local, ...remote };
  }
}

/**
 * Get sync status summary
 */
export async function getSyncStatus(): Promise<{
  pendingCount: number;
  conflictCount: number;
  lastSyncAt: string | null;
  isOnline: boolean;
}> {
  try {
    const pendingCount = await db.syncQueue
      .where('conflictResolution')
      .equals('pending')
      .count();

    // Count unresolved conflicts (where resolvedAt is null/undefined)
    const conflictCount = await db.conflicts
      .filter(c => !c.resolvedAt)
      .count();

    // Get last successful sync time
    const lastSync = await db.syncQueue
      .where('conflictResolution')
      .equals('local-wins')
      .reverse()
      .first();

    return {
      pendingCount,
      conflictCount,
      lastSyncAt: lastSync ? now() : null,
      isOnline: navigator.onLine
    };
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return {
      pendingCount: 0,
      conflictCount: 0,
      lastSyncAt: null,
      isOnline: navigator.onLine
    };
  }
}

/**
 * Clear sync queue (for testing)
 */
export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear();
  debug.log('🗑️ Sync queue cleared');
}

/**
 * Force full sync (re-sync everything)
 */
export async function forceFullSync(): Promise<SyncResult> {
  debug.log('🔄 Starting full sync...');

  // TODO: Implement full sync logic
  // 1. Fetch all remote entities
  // 2. Compare with local entities
  // 3. Resolve conflicts
  // 4. Update both local and remote

  return {
    success: true,
    synced: 0,
    conflicts: 0,
    errors: 0,
    message: 'Full sync not yet implemented'
  };
}
