import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Sparkles,
  Calendar
} from 'lucide-react';
import { exportData, importData, getExportStats } from '@/lib/export-import';
import { getDatabaseHealth, db } from '@/lib/db';
import { isAuthenticated } from '@/lib/google-auth';
import { syncAllEvents } from '@/lib/event-sync';
import { SHORTCUTS, getShortcutDisplay } from '@/hooks/useKeyboardShortcuts';
import { useAppState, actions } from '@/hooks/useAppState';
import { cn } from '@/lib/utils';
import { CalendarPreferences } from '@/components/CalendarPreferences';

export function Settings() {
  const { state, dispatch } = useAppState();
  const currentTheme = state.user?.preferences?.theme || 'dark';
  const [exportStats, setExportStats] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    debug.log('⚙️ Settings: Current theme is:', currentTheme);
  }, [currentTheme]);

  async function loadStats() {
    const [stats, health] = await Promise.all([
      getExportStats(),
      getDatabaseHealth()
    ]);

    setExportStats(stats);
    setDbHealth(health);

    // Check Google Calendar connection and last sync
    const connected = await isAuthenticated();
    setIsGoogleConnected(connected);

    if (connected) {
      const calendars = await db.calendars.toArray();
      const lastSync = calendars.length > 0 
        ? calendars.reduce((latest, cal) => {
            if (!cal.lastSyncedAt) return latest;
            return !latest || cal.lastSyncedAt > latest ? cal.lastSyncedAt : latest;
          }, null as string | null)
        : null;
      setLastSyncTime(lastSync);
    }
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
      const connected = await isAuthenticated();
      if (!connected) {
        alert('Please sign in with Google to sync calendars');
        return;
      }

      const result = await syncAllEvents();
      if (result.success) {
        alert(`Sync complete! Added: ${result.added}, Updated: ${result.updated}, Removed: ${result.removed}`);
        await loadStats();
      } else {
        alert('Sync failed: ' + result.errors.join(', '));
      }
    } catch (error) {
      alert('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="data" className="w-full">
            <TabsList className="inline-flex h-auto items-center gap-1 bg-card border border-border rounded-lg p-1 mb-6">
              <TabsTrigger value="data" className="h-8 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm px-3 text-xs transition-colors border-0">
                Data & Sync
              </TabsTrigger>
              <TabsTrigger value="appearance" className="h-8 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm px-3 text-xs transition-colors border-0">
                Appearance
              </TabsTrigger>
              <TabsTrigger value="calendars" className="h-8 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm px-3 text-xs transition-colors border-0">
                Calendars
              </TabsTrigger>
              <TabsTrigger value="shortcuts" className="h-8 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm px-3 text-xs transition-colors border-0">
                Shortcuts
              </TabsTrigger>
              <TabsTrigger value="about" className="h-8 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm px-3 text-xs transition-colors border-0">
                About
              </TabsTrigger>
            </TabsList>

            {/* Data & Sync Tab */}
            <TabsContent value="data" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Database Health */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        Database Status
                      </CardTitle>
                      {dbHealth?.healthy ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Events</p>
                        <p className="text-lg font-semibold text-foreground">{dbHealth?.eventCount || 0}</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Todos</p>
                        <p className="text-lg font-semibold text-foreground">{dbHealth?.todoCount || 0}</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Goals</p>
                        <p className="text-lg font-semibold text-foreground">{dbHealth?.goalCount || 0}</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-lg font-semibold text-foreground">{dbHealth?.noteCount || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Google Calendar Sync */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Google Calendar
                      </CardTitle>
                      {isGoogleConnected ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span className={isGoogleConnected ? 'text-green-400' : 'text-yellow-400'}>
                          {isGoogleConnected ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Sync</span>
                        <span className="text-foreground">
                          {lastSyncTime 
                            ? new Date(lastSyncTime).toLocaleString() 
                            : 'Never'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Events</span>
                        <span className="text-foreground">{dbHealth?.eventCount || 0}</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleSync}
                      disabled={syncing || !isGoogleConnected}
                      className="w-full"
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Backup & Restore */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Backup & Restore</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Export your data as a JSON backup file. You can import it later to restore your data.
                    Total size: <span className="text-foreground font-medium">{exportStats?.totalSize || '0 KB'}</span>
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleExport}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                    <Button
                      onClick={handleImport}
                      variant="outline"
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="bg-red-500/5 border-red-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Permanently delete all your data. This cannot be undone.
                  </p>
                  <Button
                    onClick={handleClearData}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Data
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Theme</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose your interface theme or sync with your system preferences
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        debug.log('⚙️ Settings: Switching to Light theme');
                        dispatch(actions.setTheme('light'));
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                        currentTheme === 'light'
                          ? "border-primary/50 bg-secondary/60"
                          : "border-border hover:border-border-strong hover:bg-secondary/30 bg-card"
                      )}
                    >
                      <Sun className="h-5 w-5 text-foreground" />
                      <span className="font-medium text-foreground text-sm">Light</span>
                    </button>

                    <button
                      onClick={() => {
                        debug.log('⚙️ Settings: Switching to Dark theme');
                        dispatch(actions.setTheme('dark'));
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                        currentTheme === 'dark'
                          ? "border-primary/50 bg-secondary/60"
                          : "border-border hover:border-border-strong hover:bg-secondary/30 bg-card"
                      )}
                    >
                      <Moon className="h-5 w-5 text-foreground" />
                      <span className="font-medium text-foreground text-sm">Dark</span>
                    </button>

                    <button
                      onClick={() => {
                        debug.log('⚙️ Settings: Switching to Auto theme');
                        dispatch(actions.setTheme('auto'));
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                        currentTheme === 'auto'
                          ? "border-primary/50 bg-secondary/60"
                          : "border-border hover:border-border-strong hover:bg-secondary/30 bg-card"
                      )}
                    >
                      <Monitor className="h-5 w-5 text-foreground" />
                      <span className="font-medium text-foreground text-sm">Auto</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Calendars Tab */}
            <TabsContent value="calendars" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Google Calendars
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose which Google Calendars to display in your app. Your primary calendar and selected calendars are enabled by default.
                  </p>
                  <CalendarPreferences />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Keyboard Shortcuts Tab */}
            <TabsContent value="shortcuts" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Keyboard className="h-4 w-4 text-muted-foreground" />
                    Keyboard Shortcuts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {SHORTCUTS.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-2.5 border-b border-border last:border-0"
                      >
                        <span className="text-muted-foreground text-sm">{shortcut.description}</span>
                        <kbd className="px-3 py-1 bg-muted text-foreground text-xs rounded border border-border font-mono">
                          {getShortcutDisplay(shortcut.key)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              <Card className="bg-card border-border">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 mb-4">
                    <Sparkles className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Optimio</h2>
                  <p className="text-muted-foreground mb-6">Your Personal Productivity Workspace</p>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Version 1.0.0</p>
                    <p>Built with React + TypeScript + Vite</p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-border">
                    <a
                      href="https://github.com/yourusername/optimio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
                    >
                      View on GitHub
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
