import { useEffect, useState } from 'react';
import { AppProvider, useAppState, actions } from '@/hooks/useAppState';
import { Dashboard } from '@/sections/Dashboard';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { initializeDatabase, migrateFromLocalStorage, checkDatabaseHealth } from '@/lib/db';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { setupPeriodicSync } from '@/lib/calendar-sync';
import { getCurrentUser, isAuthenticated } from '@/lib/google-auth';

function AppContent() {
  const { state, dispatch } = useAppState();
  const [searchOpen, setSearchOpen] = useState(false);

  useKeyboardShortcuts({
    onSearch: () => setSearchOpen(true),
    onSettings: () => dispatch(actions.setView('settings'))
  });

  // Setup Google Calendar sync when user is authenticated
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function initializeSync() {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        console.log('🔐 User authenticated, setting up Google Calendar sync...');

        // Load user info if not already in state
        if (!state.user) {
          const googleUser = await getCurrentUser();
          if (googleUser) {
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
        }

        // Setup periodic sync (syncs every 5 minutes)
        cleanup = setupPeriodicSync('primary', dispatch, actions, 5);
      }
    }

    initializeSync();

    // Cleanup function to stop syncing when component unmounts
    return () => {
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
        console.log('🚀 Initializing Optimio...');

        // Initialize IndexedDB
        await initializeDatabase();

        // Migrate legacy data if needed
        const migrated = await migrateFromLocalStorage();
        if (migrated) {
          console.log('✅ Migrated legacy data to IndexedDB');
        }

        // Check database health
        const health = await checkDatabaseHealth();
        console.log('📊 Database health:', health);

        setDbReady(true);
        console.log('✅ Optimio ready!');
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
