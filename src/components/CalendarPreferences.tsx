import { useState, useEffect } from 'react';
import { getAllCalendars, toggleCalendar, syncCalendarList } from '@/lib/calendar-storage';
import { syncAllEvents } from '@/lib/event-sync';
import { db } from '@/lib/db';
import type { GoogleCalendar } from '@/lib/db';
import { CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * CLEAN REBUILD - Calendar preferences with simple state management
 */

export function CalendarPreferences() {
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load calendars from database on mount
  useEffect(() => {
    loadCalendars();
  }, []);

  async function loadCalendars() {
    try {
      setLoading(true);
      setError(null);
      const cals = await getAllCalendars();
      setCalendars(cals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendars');
      console.error('Failed to load calendars:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setSyncing(true);
      setError(null);

      console.log('🔄 Refreshing calendar list...');

      // Fetch fresh calendar list from Google
      await syncCalendarList();

      // Re-sync events from enabled calendars
      await syncAllEvents();

      // Reload calendars from database
      await loadCalendars();

      console.log('✅ Refresh complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
      console.error('Failed to refresh:', err);
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggle(calendarId: string, currentEnabled: number) {
    try {
      const newEnabled = currentEnabled === 0 ? 1 : 0;
      // Update in database
      await toggleCalendar(calendarId, newEnabled === 1);

      // Update local state
      setCalendars(cals =>
        cals.map(cal =>
          cal.id === calendarId ? { ...cal, enabled: newEnabled } : cal
        )
      );

      if (newEnabled === 1) {
        // If enabling a calendar, sync its events
        console.log('🔄 Syncing events for newly enabled calendar...');
        await syncAllEvents();
      } else {
        // If disabling a calendar, delete its events
        console.log('🗑️ Removing events for disabled calendar...');
        const eventsToDelete = await db.events
          .where('sourceCalendarId')
          .equals(calendarId)
          .toArray();
        
        if (eventsToDelete.length > 0) {
          await db.events.bulkDelete(eventsToDelete.map(e => e.id));
          console.log(`  ✅ Deleted ${eventsToDelete.length} events from disabled calendar`);
          
          // Reload page to refresh events in UI
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Failed to toggle calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle calendar');
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground text-sm text-center py-8">
        Loading calendars...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <Button onClick={loadCalendars} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm mb-4">
          No calendars found. Sign in with Google to view your calendars.
        </p>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    );
  }

  const enabledCount = calendars.filter(c => c.enabled === 1).length;

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {enabledCount} of {calendars.length} calendars enabled
        </p>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={syncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Refresh'}
        </Button>
      </div>

      {/* Calendar list */}
      <div className="space-y-2">
        {calendars.map((calendar) => (
          <div
            key={calendar.id}
            className="flex items-center justify-between py-3 px-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Calendar color indicator */}
              <div
                className="w-4 h-4 rounded-full border-2 border-white flex-shrink-0"
                style={{ backgroundColor: calendar.backgroundColor || '#3b82f6' }}
              />

              {/* Calendar info */}
              <div className="flex flex-col min-w-0">
                <span className="text-foreground font-medium text-sm truncate">
                  {calendar.summary}
                  {calendar.primary && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {calendar.accessRole === 'owner' && 'Owner'}
                  {calendar.accessRole === 'writer' && 'Can edit'}
                  {calendar.accessRole === 'reader' && 'Read only'}
                  {calendar.lastSyncedAt && ` • Last synced: ${new Date(calendar.lastSyncedAt).toLocaleTimeString()}`}
                </span>
              </div>
            </div>

            {/* Toggle button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(calendar.id, calendar.enabled)}
              title={calendar.enabled === 1 ? 'Click to disable' : 'Click to enable'}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              {calendar.enabled === 1 ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
