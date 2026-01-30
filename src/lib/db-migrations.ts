/**
 * Database migrations for Dexie
 * Handles schema upgrades and data migrations
 */

import { logger } from './logger';

const log = logger('db-migrations');

// =============================================================================
// Migration Types
// =============================================================================

interface Migration {
  version: number;
  description: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

// =============================================================================
// Migration Registry
// =============================================================================

const migrations: Migration[] = [
  {
    version: 2,
    description: 'Add color field to events',
    up: async () => {
      // Migration logic will be added here when needed
      log.info('Migration v2: Adding color field to events');
    },
  },
  // Add more migrations here as needed
];

// =============================================================================
// Migration Runner
// =============================================================================

export class DatabaseMigrator {
  private db: any; // Dexie instance
  private currentVersion: number;

  constructor(db: any, currentVersion: number) {
    this.db = db;
    this.currentVersion = currentVersion;
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    const dbVersion = await this.getDatabaseVersion();
    
    log.info(`Checking migrations. DB: v${dbVersion}, App: v${this.currentVersion}`);

    const pendingMigrations = migrations.filter(m => m.version > dbVersion);

    if (pendingMigrations.length === 0) {
      log.info('No pending migrations');
      return;
    }

    log.info(`Running ${pendingMigrations.length} migration(s)`);

    for (const migration of pendingMigrations) {
      try {
        log.info(`Running migration v${migration.version}: ${migration.description}`);
        await migration.up();
        await this.setDatabaseVersion(migration.version);
        log.info(`Migration v${migration.version} completed`);
      } catch (error) {
        log.error(`Migration v${migration.version} failed`, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }

    log.info('All migrations completed');
  }

  /**
   * Get current database version from metadata store
   */
  private async getDatabaseVersion(): Promise<number> {
    try {
      const version = await this.db.metadata?.get('schema_version');
      return version?.value || 1;
    } catch {
      return 1;
    }
  }

  /**
   * Set database version in metadata store
   */
  private async setDatabaseVersion(version: number): Promise<void> {
    try {
      await this.db.metadata?.put({ key: 'schema_version', value: version });
    } catch (error) {
      log.warn('Failed to set database version', { error });
    }
  }

  /**
   * Register a new migration
   */
  static register(migration: Migration): void {
    migrations.push(migration);
    // Sort by version
    migrations.sort((a, b) => a.version - b.version);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a migration is needed
 */
export async function isMigrationNeeded(db: any, targetVersion: number): Promise<boolean> {
  try {
    const currentVersion = await db.metadata?.get('schema_version');
    return (currentVersion?.value || 1) < targetVersion;
  } catch {
    return true;
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(db: any): Promise<{
  currentVersion: number;
  pendingCount: number;
  migrations: Array<{ version: number; description: string }>;
}> {
  const currentVersion = await db.metadata?.get('schema_version').then((v: any) => v?.value || 1);
  const pending = migrations.filter(m => m.version > currentVersion);

  return {
    currentVersion,
    pendingCount: pending.length,
    migrations: pending.map(m => ({
      version: m.version,
      description: m.description,
    })),
  };
}

export default DatabaseMigrator;
