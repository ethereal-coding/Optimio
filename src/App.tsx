import { useEffect, useState } from 'react';
import { AppProvider, useAppState, actions } from '@/hooks/useAppState';
import { Dashboard } from '@/sections/Dashboard';
import { debug } from '@/lib/debug';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { initializeDatabase, db } from '@/lib/db';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { getCurrentUser, isAuthenticated } from '@/lib/google-auth';
import { syncCalendarList } from '@/lib/calendar-storage';
import { syncAllEvents } from '@/lib/event-sync';

function AppContent() {
  const { state, dispatch } = useAppState();
  const [searchOpen, setSearchOpen] = useState(false);

  useKeyboardShortcuts({
    onSearch: () => setSearchOpen(true),
    onSettings: () => dispatch(actions.setView('settings'))
  });

  // Hydrate events from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;

    async function hydrateFromDatabase() {
      try {
        debug.log('💧 Hydrating events from IndexedDB...');

        // Load events from IndexedDB
        const storedEvents = await db.events.toArray();

        if (!isMounted) return;

        if (storedEvents.length > 0) {
          debug.log(`📥 Loaded ${storedEvents.length} events from cache`);

          // Group events by calendar
          const eventsByCalendar = new Map<string, any[]>();
          storedEvents.forEach(event => {
            const calId = event.calendarId || '1';
            if (!eventsByCalendar.has(calId)) {
              eventsByCalendar.set(calId, []);
            }
            eventsByCalendar.get(calId)!.push(event);
          });

          // Dispatch events to state
          eventsByCalendar.forEach((events, calendarId) => {
            events.forEach(event => {
              dispatch(actions.addEvent(calendarId, event));
            });
          });

          debug.log('✅ Hydration complete');
        } else {
          debug.log('📭 No cached events found');
        }
      } catch (error) {
        console.error('Failed to hydrate from IndexedDB:', error);
      }
    }

    hydrateFromDatabase();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  // Setup Google Calendar sync when user is authenticated
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let isMounted = true;

    async function initializeSync() {
      debug.log('🔍 Checking authentication status...');
      const authenticated = await isAuthenticated();
      debug.log('✅ Authenticated:', authenticated);

      if (!isMounted) return;

      if (authenticated) {
        debug.log('🔐 User authenticated, setting up Google Calendar sync...');

        // Load user info if not already in state
        const googleUser = await getCurrentUser();
        debug.log('👤 Google User:', googleUser);

        if (!isMounted) return;

        if (googleUser && !state.user) {
          // Only set user if not already set
          debug.log('📝 Setting user in app state...');
          dispatch(actions.setUser({
            id: googleUser.id,
            name: googleUser.name,
            email: googleUser.email,
            picture: googleUser.picture,
            avatar: googleUser.picture,
            preferences: {
              theme: 'dark',
              notifications: true,
              startOfWeek: 0
            }
          }));
        }

        // Initial calendar and event sync
        debug.log('🔄 Starting initial sync...');
        (async () => {
          try {
            await syncCalendarList();
            await syncAllEvents();
            debug.log('✅ Initial sync complete');

            // Reload events from database
            const events = await db.events.toArray();
            events.forEach(event => {
              dispatch(actions.addEvent('1', event));
            });
          } catch (error) {
            console.error('Failed to sync:', error);
          }
        })();

        // Setup periodic sync (syncs every 5 minutes)
        const intervalId = setInterval(async () => {
          debug.log('🔄 Periodic sync...');
          try {
            await syncAllEvents();
          } catch (error) {
            console.error('Periodic sync failed:', error);
          }
        }, 5 * 60 * 1000);

        cleanup = () => clearInterval(intervalId);
      } else {
        debug.log('❌ Not authenticated, skipping sync setup');
      }
    }

    initializeSync();

    // Cleanup function to stop syncing when component unmounts
    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, []); // Only run once on mount

  return (
    <>
      <Dashboard onSearchOpen={() => setSearchOpen(true)} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showError, setShowError] = useState(true);

  useEffect(() => {
    async function setupDatabase() {
      try {
        debug.log('🚀 Initializing Optimio...');

        // Initialize IndexedDB
        await initializeDatabase();

        // Migrate legacy data if needed
        const migrated = await migrateFromLocalStorage();
        if (migrated) {
          debug.log('✅ Migrated legacy data to IndexedDB');
        }

        // Check database health
        const health = await checkDatabaseHealth();
        debug.log('📊 Database health:', health);

        setDbReady(true);
        debug.log('✅ Optimio ready!');
      } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        // Don't block the UI - just skip database features for now
        setDbError(error instanceof Error ? error.message : 'Unknown error');
        setDbReady(true); // Allow app to load anyway
      }
    }

    setupDatabase();
  }, []);

  // Loading state
  if (!dbReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
          <p className="mt-4 text-muted-foreground">Loading Optimio...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <ThemeProvider>
          <div className="min-h-screen bg-background text-foreground">
            {dbError && showError && (
              <div className="fixed top-4 right-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md z-50 flex items-start gap-3">
                <p className="text-red-400 text-sm flex-1">
                  Database initialization failed. Some features may not work.
                </p>
                <button
                  onClick={() => setShowError(false)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            )}
            <AppContent />
            <Toaster position="bottom-right" />
          </div>
        </ThemeProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
