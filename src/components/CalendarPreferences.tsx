import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import type { CalendarPreference } from '@/lib/db';
import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CalendarPreferences() {
  const [calendars, setCalendars] = useState<CalendarPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendars();
  }, []);

  async function loadCalendars() {
    try {
      const prefs = await db.calendarPreferences.toArray();
      // Sort: primary first, then alphabetically
      prefs.sort((a, b) => {
        if (a.primary && !b.primary) return -1;
        if (!a.primary && b.primary) return 1;
        return a.summary.localeCompare(b.summary);
      });
      setCalendars(prefs);
    } catch (error) {
      console.error('Failed to load calendar preferences:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleCalendar(calendarId: string, currentState: boolean) {
    try {
      await db.calendarPreferences.update(calendarId, {
        enabled: !currentState
      });
      await loadCalendars();
    } catch (error) {
      console.error('Failed to toggle calendar:', error);
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground text-sm text-center py-8">
        Loading calendars...
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="text-muted-foreground text-sm text-center py-8">
        <p>No calendars found.</p>
        <p className="mt-2">Sign in with Google to view your calendars.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calendars.map((calendar) => (
        <div
          key={calendar.id}
          className="flex items-center justify-between py-3 px-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* Calendar color indicator */}
            <div
              className="w-4 h-4 rounded-full border-2 border-white"
              style={{ backgroundColor: calendar.color }}
            />

            {/* Calendar info */}
            <div className="flex flex-col">
              <span className="text-foreground font-medium text-sm">
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
              </span>
            </div>
          </div>

          {/* Toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleCalendar(calendar.id, calendar.enabled)}
            className="h-8 w-8 p-0"
          >
            {calendar.enabled ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </div>
      ))}

      <p className="text-muted-foreground text-xs mt-4">
        {calendars.filter(c => c.enabled).length} of {calendars.length} calendars enabled
      </p>
    </div>
  );
}
