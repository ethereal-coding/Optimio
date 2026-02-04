import { db } from './db';
import { format } from 'date-fns';
import { now } from './dates';
import { debug } from './debug';
import type { SyncableEvent } from './db';
import type { Todo, Goal, Note, UserPreferences } from '@/types';

interface ExportData {
  version: number;
  appName: string;
  exportedAt: string;
  events: SyncableEvent[];
  todos: Todo[];
  goals: Goal[];
  notes: Note[];
  settings: UserPreferences | Record<string, unknown>;
}

/**
 * Export all data to JSON file
 */
export async function exportData(): Promise<void> {
  try {
    debug.log('📦 Starting data export...');

    // Gather all data
    const [events, todos, goals, notes, settings] = await Promise.all([
      db.events.toArray(),
      db.todos.toArray(),
      db.goals.toArray(),
      db.notes.toArray(),
      db.settings.get('user-preferences')
    ]);

    const exportData: ExportData = {
      version: 1,
      appName: 'Optimio',
      exportedAt: now(),
      events,
      todos,
      goals,
      notes,
      settings: settings || {}
    };

    // Create blob
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
    const filename = `optimio-backup-${timestamp}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    debug.log(`✅ Exported ${events.length} events, ${todos.length} todos, ${goals.length} goals, ${notes.length} notes`);
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw new Error('Failed to export data. Please try again.');
  }
}

/**
 * Import data from JSON file
 */
export async function importData(file: File): Promise<{
  success: boolean;
  imported: {
    events: number;
    todos: number;
    goals: number;
    notes: number;
  };
  message: string;
}> {
  try {
    debug.log('📥 Starting data import...');

    // Read file
    const text = await file.text();
    const data: ExportData = JSON.parse(text);

    // Validate format
    if (!data.version || !data.appName || data.appName !== 'Optimio') {
      throw new Error('Invalid backup file format');
    }

    if (data.version !== 1) {
      throw new Error(`Unsupported backup version: ${data.version}`);
    }

    // Ask user if they want to merge or replace
    const shouldReplace = confirm(
      'Do you want to REPLACE all existing data?\n\n' +
      'Click OK to replace everything.\n' +
      'Click Cancel to merge with existing data.'
    );

    // Import data in transaction
    await db.transaction('rw', [db.events, db.todos, db.goals, db.notes, db.settings], async () => {
      if (shouldReplace) {
        // Clear existing data
        await Promise.all([
          db.events.clear(),
          db.todos.clear(),
          db.goals.clear(),
          db.notes.clear()
        ]);
        debug.log('🗑️ Cleared existing data');
      }

      // Import events
      if (data.events && data.events.length > 0) {
        if (shouldReplace) {
          await db.events.bulkAdd(data.events);
        } else {
          await db.events.bulkPut(data.events);
        }
      }

      // Import todos
      if (data.todos && data.todos.length > 0) {
        if (shouldReplace) {
          await db.todos.bulkAdd(data.todos);
        } else {
          await db.todos.bulkPut(data.todos);
        }
      }

      // Import goals
      if (data.goals && data.goals.length > 0) {
        if (shouldReplace) {
          await db.goals.bulkAdd(data.goals);
        } else {
          await db.goals.bulkPut(data.goals);
        }
      }

      // Import notes
      if (data.notes && data.notes.length > 0) {
        if (shouldReplace) {
          await db.notes.bulkAdd(data.notes);
        } else {
          await db.notes.bulkPut(data.notes);
        }
      }

      // Import settings (always replace)
      if (data.settings) {
        const settings = data.settings as Record<string, unknown>;
        await db.settings.put({
          id: 'user-preferences',
          theme: (settings.theme as 'dark' | 'light' | 'auto') ?? 'auto',
          weekStartsOn: (settings.weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6) ?? 0,
          defaultCalendarView: (settings.defaultCalendarView as 'day' | 'week' | 'month') ?? 'month',
          timeFormat: (settings.timeFormat as '12h' | '24h') ?? '12h',
          dateFormat: (settings.dateFormat as string) ?? 'MM/dd/yyyy',
          autoSync: (settings.autoSync as boolean) ?? true,
          syncInterval: (settings.syncInterval as number) ?? 5
        });
      }
    });

    const result = {
      success: true,
      imported: {
        events: data.events?.length || 0,
        todos: data.todos?.length || 0,
        goals: data.goals?.length || 0,
        notes: data.notes?.length || 0
      },
      message: shouldReplace
        ? 'Data replaced successfully'
        : 'Data merged successfully'
    };

    debug.log('✅ Import complete:', result);
    return result;
  } catch (error) {
    console.error('❌ Import failed:', error);
    return {
      success: false,
      imported: {
        events: 0,
        todos: 0,
        goals: 0,
        notes: 0
      },
      message: error instanceof Error ? error.message : 'Import failed'
    };
  }
}

/**
 * Export data as CSV (for specific entity types)
 */
export async function exportToCSV(
  entityType: 'events' | 'todos' | 'goals' | 'notes'
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any[] = [];
    let filename: string;
    let headers: string[];

    switch (entityType) {
      case 'events':
        data = await db.events.toArray();
        filename = 'optimio-events.csv';
        headers = ['ID', 'Title', 'Description', 'Start Time', 'End Time', 'Location', 'Color'];
        break;

      case 'todos':
        data = await db.todos.toArray();
        filename = 'optimio-todos.csv';
        headers = ['ID', 'Title', 'Priority', 'Category', 'Due Date', 'Completed'];
        break;

      case 'goals':
        data = await db.goals.toArray();
        filename = 'optimio-goals.csv';
        headers = ['ID', 'Title', 'Category', 'Current Value', 'Target Value', 'Deadline'];
        break;

      case 'notes':
        data = await db.notes.toArray();
        filename = 'optimio-notes.csv';
        headers = ['ID', 'Title', 'Content', 'Tags', 'Folder', 'Created At'];
        break;
    }

    if (data.length === 0) {
      alert(`No ${entityType} to export`);
      return;
    }

    // Build CSV
    const rows: string[][] = [headers];

    data.forEach(item => {
      const row = headers.map(header => {
        const key = header.toLowerCase().replace(/ /g, '');
        let value = item[key] || '';

        // Handle special cases
        if (typeof value === 'object' && !Array.isArray(value)) {
          value = JSON.stringify(value);
        } else if (Array.isArray(value)) {
          value = value.join('; ');
        }

        // Escape commas and quotes
        value = String(value).replace(/"/g, '""');
        return `"${value}"`;
      });

      rows.push(row);
    });

    const csv = rows.map(row => row.join(',')).join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    debug.log(`✅ Exported ${data.length} ${entityType} to CSV`);
  } catch (error) {
    console.error('CSV export failed:', error);
    throw error;
  }
}

/**
 * Get export statistics
 */
export async function getExportStats(): Promise<{
  events: number;
  todos: number;
  goals: number;
  notes: number;
  totalSize: string;
}> {
  try {
    const [events, todos, goals, notes] = await Promise.all([
      db.events.count(),
      db.todos.count(),
      db.goals.count(),
      db.notes.count()
    ]);

    // Estimate size (rough calculation)
    const estimatedSize = (events + todos + goals + notes) * 1024; // ~1KB per item
    const totalSize =
      estimatedSize < 1024 * 1024
        ? `${Math.round(estimatedSize / 1024)} KB`
        : `${(estimatedSize / (1024 * 1024)).toFixed(2)} MB`;

    return {
      events,
      todos,
      goals,
      notes,
      totalSize
    };
  } catch (error) {
    console.error('Failed to get export stats:', error);
    return {
      events: 0,
      todos: 0,
      goals: 0,
      notes: 0,
      totalSize: '0 KB'
    };
  }
}
