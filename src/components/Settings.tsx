import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  RefreshCw,
  Database,
  Keyboard,
  Trash2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { exportData, importData, getExportStats } from '@/lib/export-import';
import { getSyncStatus, processSyncQueue } from '@/lib/sync-engine';
import { checkDatabaseHealth, db } from '@/lib/db';
import { SHORTCUTS, getShortcutDisplay } from '@/hooks/useKeyboardShortcuts';

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Settings({ open, onOpenChange }: SettingsProps) {
  const [exportStats, setExportStats] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open]);

  async function loadStats() {
    const [stats, sync, health] = await Promise.all([
      getExportStats(),
      getSyncStatus(),
      checkDatabaseHealth()
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-muted-foreground" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your Optimio preferences and data
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="data" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="data">Data & Sync</TabsTrigger>
            <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* Data & Sync Tab */}
          <TabsContent value="data" className="space-y-4 mt-4">
            {/* Database Health */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    Database Status
                  </CardTitle>
                  {dbHealth?.healthy ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
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

            {/* Sync Status */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  Sync Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pending Changes</span>
                    <span className="text-foreground font-medium">{syncStatus?.pendingCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Conflicts</span>
                    <span className="text-foreground font-medium">{syncStatus?.conflictCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <span className={syncStatus?.isOnline ? 'text-green-500 font-medium' : 'text-destructive font-medium'}>
                      {syncStatus?.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </CardContent>
            </Card>

            {/* Export / Import */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Backup & Restore</CardTitle>
                <CardDescription>
                  Export your data as a JSON backup file. You can import it later to restore your data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Total size: <span className="text-foreground font-medium">{exportStats?.totalSize || '0 KB'}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4" />
                    Export Data
                  </Button>
                  <Button
                    onClick={handleImport}
                    variant="outline"
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4" />
                    Import Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Permanently delete all your data. This cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleClearData}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keyboard Shortcuts Tab */}
          <TabsContent value="shortcuts" className="mt-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                  Keyboard Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {SHORTCUTS.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-3 first:pt-0 last:pb-0"
                    >
                      <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                      <kbd className="px-2.5 py-1 bg-muted text-foreground text-xs rounded-md border border-border font-mono">
                        {getShortcutDisplay(shortcut.key)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-4">
            <Card className="border-border">
              <CardContent className="pt-6 text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">Optimio</h2>
                <p className="text-muted-foreground mb-6">Your Personal Productivity Workspace</p>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Version 1.0.0</p>
                  <p>Built with React + TypeScript + Vite</p>
                  <p className="pt-4">
                    <a
                      href="https://github.com/yourusername/optimio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
                    >
                      View on GitHub
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
