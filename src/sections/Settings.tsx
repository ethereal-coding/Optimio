import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { debug } from '@/lib/debug';
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  RefreshCw,
  Database,
  Keyboard,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  Sparkles
} from 'lucide-react';
import { exportData, importData, getExportStats } from '@/lib/export-import';
import { getSyncStatus, processSyncQueue } from '@/lib/sync-engine';
import { getDatabaseHealth, db } from '@/lib/db';
import { SHORTCUTS, getShortcutDisplay } from '@/hooks/useKeyboardShortcuts';
import { useAppState, actions } from '@/hooks/useAppState';
import { cn } from '@/lib/utils';
import { CalendarPreferences } from '@/components/CalendarPreferences';

export function Settings() {
  const { state, dispatch } = useAppState();
  const currentTheme = state.user?.preferences?.theme || 'dark';
  const [exportStats, setExportStats] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    debug.log('⚙️ Settings: Current theme is:', currentTheme);
  }, [currentTheme]);

  async function loadStats() {
    const [stats, sync, health] = await Promise.all([
      getExportStats(),
      getSyncStatus(),
      getDatabaseHealth()
    ]);

    setExportStats(stats);
    setSyncStatus(sync);
    setDbHealth(health);
  }

  async function handleExport() {
    try {
      await exportData();
      alert('Data exported successfully!');
    } catch (error) {
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await importData(file);
        alert(result.message + `\n\nImported:\n- ${result.imported.events} events\n- ${result.imported.todos} todos\n- ${result.imported.goals} goals\n- ${result.imported.notes} notes`);
        await loadStats();
      } catch (error) {
        alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };

    input.click();
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await processSyncQueue();
      alert(result.message);
      await loadStats();
    } catch (error) {
      alert('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleClearData() {
    if (!confirm('⚠️ WARNING: This will delete ALL your data!\n\nThis action cannot be undone. Are you absolutely sure?')) {
      return;
    }

    if (!confirm('Final confirmation: Delete everything?')) {
      return;
    }

    try {
      await Promise.all([
        db.events.clear(),
        db.todos.clear(),
        db.goals.clear(),
        db.notes.clear(),
        db.syncQueue.clear(),
        db.conflicts.clear()
      ]);

      alert('All data cleared');
      await loadStats();
      window.location.reload();
    } catch (error) {
      alert('Failed to clear data');
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your Optimio preferences and data</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="data" className="w-full">
            <TabsList className="inline-flex h-auto items-center gap-1 bg-card border border-border rounded-lg p-1 mb-6">
              <TabsTrigger value="data" className="h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md px-3 text-sm transition-colors border-0">
                Data & Sync
              </TabsTrigger>
              <TabsTrigger value="appearance" className="h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md px-3 text-sm transition-colors border-0">
                Appearance
              </TabsTrigger>
              <TabsTrigger value="calendars" className="h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md px-3 text-sm transition-colors border-0">
                Calendars
              </TabsTrigger>
              <TabsTrigger value="shortcuts" className="h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md px-3 text-sm transition-colors border-0">
                Shortcuts
              </TabsTrigger>
              <TabsTrigger value="about" className="h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md px-3 text-sm transition-colors border-0">
                About
              </TabsTrigger>
            </TabsList>

            {/* Data & Sync Tab */}
            <TabsContent value="data" className="space-y-6">
              {/* Database Health */}
              <div className="bg-card rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-foreground font-medium flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Database Status
                  </h3>
                  {dbHealth?.healthy ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted p-3 rounded">
                    <p className="text-muted-foreground">Events</p>
                    <p className="text-foreground text-lg font-semibold">{dbHealth?.eventCount || 0}</p>
                  </div>
                  <div className="bg-muted p-3 rounded">
                    <p className="text-muted-foreground">Todos</p>
                    <p className="text-foreground text-lg font-semibold">{dbHealth?.todoCount || 0}</p>
                  </div>
                  <div className="bg-muted p-3 rounded">
                    <p className="text-muted-foreground">Goals</p>
                    <p className="text-foreground text-lg font-semibold">{dbHealth?.goalCount || 0}</p>
                  </div>
                  <div className="bg-muted p-3 rounded">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="text-foreground text-lg font-semibold">{dbHealth?.noteCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* Sync Status */}
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-foreground font-medium mb-4 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Sync Status
                </h3>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Changes</span>
                    <span className="text-foreground">{syncStatus?.pendingCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conflicts</span>
                    <span className="text-foreground">{syncStatus?.conflictCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className={syncStatus?.isOnline ? 'text-green-400' : 'text-red-400'}>
                      {syncStatus?.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>

              {/* Export / Import */}
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-foreground font-medium mb-4">Backup & Restore</h3>

                <div className="text-sm text-muted-foreground mb-4">
                  Export your data as a JSON backup file. You can import it later to restore your data.
                  <div className="mt-2">
                    Total size: <span className="text-foreground">{exportStats?.totalSize || '0 KB'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                  <Button
                    onClick={handleImport}
                    variant="outline"
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </Button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Permanently delete all your data. This cannot be undone.
                </p>
                <Button
                  onClick={handleClearData}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Data
                </Button>
              </div>
            </TabsContent>

            {/* Utilities Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-foreground font-medium mb-2">Theme</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Choose your interface theme or sync with your system preferences
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      debug.log('⚙️ Settings: Switching to Light theme');
                      dispatch(actions.setTheme('light'));
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      currentTheme === 'light'
                        ? "border-primary bg-accent"
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <Sun className="h-8 w-8 text-foreground" />
                    <span className="font-medium text-foreground text-sm">Light</span>
                  </button>

                  <button
                    onClick={() => {
                      debug.log('⚙️ Settings: Switching to Dark theme');
                      dispatch(actions.setTheme('dark'));
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      currentTheme === 'dark'
                        ? "border-primary bg-accent"
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <Moon className="h-8 w-8 text-foreground" />
                    <span className="font-medium text-foreground text-sm">Dark</span>
                  </button>

                  <button
                    onClick={() => {
                      debug.log('⚙️ Settings: Switching to Auto theme');
                      dispatch(actions.setTheme('auto'));
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      currentTheme === 'auto'
                        ? "border-primary bg-accent"
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <Monitor className="h-8 w-8 text-foreground" />
                    <span className="font-medium text-foreground text-sm">Auto</span>
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Calendars Tab */}
            <TabsContent value="calendars">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-foreground font-medium mb-4">Google Calendars</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Choose which Google Calendars to display in your app. Your primary calendar and selected calendars are enabled by default.
                </p>

                {/* Calendar list will be populated here */}
                <CalendarPreferences />
              </div>
            </TabsContent>

            {/* Keyboard Shortcuts Tab */}
            <TabsContent value="shortcuts">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-foreground font-medium mb-4 flex items-center gap-2">
                  <Keyboard className="w-4 h-4" />
                  Keyboard Shortcuts
                </h3>

                <div className="space-y-2">
                  {SHORTCUTS.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2 border-b border-border last:border-0"
                    >
                      <span className="text-muted-foreground text-sm">{shortcut.description}</span>
                      <kbd className="px-3 py-1 bg-muted text-foreground text-xs rounded border border-border font-mono">
                        {getShortcutDisplay(shortcut.key)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about">
              <div className="bg-card rounded-lg p-8 border border-border text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">Optimio</h2>
                <p className="text-muted-foreground mb-6">Your Personal Productivity Workspace</p>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Version 1.0.0</p>
                  <p>Built with React + TypeScript + Vite</p>
                  <p className="mt-4">
                    <a
                      href="https://github.com/yourusername/optimio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground underline"
                    >
                      View on GitHub
                    </a>
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
