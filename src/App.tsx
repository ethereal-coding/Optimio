import { useEffect, useState } from 'react';
import { AppProvider, useAppState, actions } from '@/hooks/useAppState';
import { Dashboard } from '@/sections/Dashboard';
import { debug } from '@/lib/debug';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { initializeDatabase, db } from '@/lib/db';
import { loadTodosFromDB } from '@/lib/todo-sync';
import { loadGoalsFromDB } from '@/lib/goal-sync';
import { loadNotesFromDB } from '@/lib/note-sync';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { getCurrentUser, isAuthenticated } from '@/lib/google-auth';
import { AuthWall } from '@/components/AuthWall';
import { syncCalendarList } from '@/lib/calendar-storage';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { logger } from '@/lib/logger';
import '@/lib/debug-helpers'; // Loads debug helpers into window.debugCRM

const log = logger('App');

/**
 * Main application content component
 * Handles data hydration, sync, and renders the dashboard
 */
function AppContent() {
  const { state, dispatch } = useAppState();
  const [searchOpen, setSearchOpen] = useState(false);

  // Initialize calendar sync (automatic background sync every 10s)
  useCalendarSync({
    interval: 10000,
    enabled: true,
    maxRetries: 3,
  });

  useKeyboardShortcuts({
    onSearch: () => setSearchOpen(true),
    onSettings: () => dispatch(actions.setView('settings'))
  });

  // Hydrate events and todos from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;

    async function hydrateFromDatabase() {
      try {
        log.info('Hydrating data from IndexedDB');
        debug.log('💧 Hydrating data from IndexedDB...');

        // Load enabled calendar IDs first
        const enabledCalendars = await db.calendars
          .where('enabled')
          .equals(1)
          .toArray();
        const enabledCalendarIds = new Set(enabledCalendars.map(c => c.id));
        
        debug.log(`📅 ${enabledCalendarIds.size} enabled calendars`);

        // Load events from IndexedDB
        const storedEvents = await db.events.toArray();

        if (!isMounted) return;

        if (storedEvents.length > 0) {
          debug.log(`📥 Loaded ${storedEvents.length} events from cache`);

          // Convert date strings back to Date objects
          // Filter out events from disabled calendars
          const hydratedEvents = storedEvents
            .filter(event => !event.sourceCalendarId || enabledCalendarIds.has(event.sourceCalendarId))
            .map(event => ({
              ...event,
              startTime: event.startTime instanceof Date ? event.startTime : new Date(event.startTime),
              endTime: event.endTime instanceof Date ? event.endTime : new Date(event.endTime)
            }));

          const skippedCount = storedEvents.length - hydratedEvents.length;
          if (skippedCount > 0) {
            debug.log(`⏭️ Skipped ${skippedCount} events from disabled calendars`);
          }

          // Replace all events at once (properly handles deletions)
          dispatch(actions.setEvents('1', hydratedEvents));
          debug.log(`✅ Hydrated ${hydratedEvents.length} events into state`);
        } else {
          debug.log('📭 No cached events found');
        }

        // Load todos from IndexedDB
        const storedTodos = await db.todos.toArray();
        
        if (!isMounted) return;

        if (storedTodos.length > 0) {
          debug.log(`📥 Loaded ${storedTodos.length} todos from cache`);

          for (const todo of storedTodos) {
            // Ensure dates are Date objects and provide defaults for missing fields
            const hydratedTodo = {
              ...todo,
              dueDate: todo.dueDate ? (todo.dueDate instanceof Date ? todo.dueDate : new Date(todo.dueDate)) : undefined,
              completedAt: todo.completedAt ? (todo.completedAt instanceof Date ? todo.completedAt : new Date(todo.completedAt)) : undefined,
              createdAt: todo.createdAt instanceof Date ? todo.createdAt : new Date(todo.createdAt),
              updatedAt: todo.updatedAt instanceof Date ? todo.updatedAt : new Date(todo.updatedAt),
              priority: todo.priority || 'medium',
              completed: todo.completed || false
            };
            dispatch(actions.addTodo(hydratedTodo));
          }
        } else {
          debug.log('📭 No cached todos found');
        }

        // Load goals from IndexedDB
        const storedGoals = await db.goals.toArray();
        
        if (!isMounted) return;

        if (storedGoals.length > 0) {
          debug.log(`📥 Loaded ${storedGoals.length} goals from cache`);

          for (const goal of storedGoals) {
            // Ensure dates are Date objects and provide defaults for missing fields
            const hydratedGoal = {
              ...goal,
              deadline: goal.deadline ? (goal.deadline instanceof Date ? goal.deadline : new Date(goal.deadline)) : undefined,
              createdAt: goal.createdAt instanceof Date ? goal.createdAt : new Date(goal.createdAt),
              milestones: goal.milestones || [],
              currentValue: goal.currentValue || 0
            };
            dispatch(actions.addGoal(hydratedGoal));
          }
        } else {
          debug.log('📭 No cached goals found');
        }

        // Load notes from IndexedDB
        const storedNotes = await db.notes.toArray();
        
        if (!isMounted) return;

        if (storedNotes.length > 0) {
          debug.log(`📥 Loaded ${storedNotes.length} notes from cache`);

          for (const note of storedNotes) {
            // Ensure dates are Date objects and provide defaults for missing fields
            const hydratedNote = {
              ...note,
              createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt),
              updatedAt: note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt),
              tags: note.tags || [],
              isPinned: note.isPinned || false,
              isFavorite: note.isFavorite || false
            };
            dispatch(actions.addNote(hydratedNote));
          }
        } else {
          debug.log('📭 No cached notes found');
        }

        log.info('Hydration complete');
        debug.log('✅ Hydration complete');
      } catch (error) {
        log.error('Failed to hydrate from IndexedDB', error instanceof Error ? error : new Error(String(error)));
        console.error('Failed to hydrate from IndexedDB:', error);
      }
    }

    hydrateFromDatabase();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  // Setup Google Calendar user info when authenticated
  useEffect(() => {
    let isMounted = true;

    async function initializeUser() {
      log.info('Checking authentication status');
      debug.log('🔍 Checking authentication status...');
      
      const authenticated = await isAuthenticated();
      debug.log('✅ Authenticated:', authenticated);

      if (!isMounted) return;

      if (authenticated) {
        log.info('User authenticated, loading user info');
        debug.log('🔐 User authenticated, setting up Google Calendar...');

        // Load user info if not already in state
        const googleUser = await getCurrentUser();
        debug.log('👤 Google User:', googleUser);

        if (!isMounted) return;

        if (googleUser && !state.user) {
          log.info('Setting user in app state', { email: googleUser.email });
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

        // Initial calendar list sync
        debug.log('🔄 Starting initial calendar sync...');
        try {
          await syncCalendarList();
          log.info('Initial calendar sync complete');
          debug.log('✅ Initial calendar sync complete');
        } catch (error) {
          log.error('Initial calendar sync failed', error instanceof Error ? error : new Error(String(error)));
          console.error('Failed to sync calendar list:', error);
        }
      } else {
        log.info('User not authenticated');
        debug.log('❌ Not authenticated, skipping sync setup');
      }
    }

    initializeUser();

    return () => {
      isMounted = false;
    };
  }, [dispatch, state.user]);

  return (
    <AuthWall>
      <Dashboard onSearchOpen={() => setSearchOpen(true)} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </AuthWall>
  );
}

/**
 * Root App component
 * Handles database initialization and provides error boundary
 */
function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function setupDatabase() {
      try {
        log.info('Initializing Optimio');
        debug.log('🚀 Initializing Optimio...');

        // Initialize IndexedDB
        await initializeDatabase();

        log.info('Database initialized');
        debug.log('✅ Database initialized');

        setDbReady(true);
        debug.log('✅ Optimio ready!');
      } catch (error) {
        log.error('Failed to initialize database', error instanceof Error ? error : new Error(String(error)));
        console.error('❌ Failed to initialize database:', error);
        // Don't block the UI - just skip database features for now
        setDbError(error instanceof Error ? error.message : 'Unknown error');
        setDbReady(true); // Allow app to load anyway
      }
    }

    setupDatabase();
  }, []);

  if (!dbReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Optimio...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="optimio-theme">
        <AppProvider>
          <AppContent />
          <Toaster />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
