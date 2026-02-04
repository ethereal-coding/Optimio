import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider, type PersistedClient } from '@tanstack/react-query-persist-client'
import { get, set, del } from 'idb-keyval'
import './index.css'
import App from './App.tsx'
import { initializeGoogleAuth } from './lib/google-auth'
import { initSentry } from './lib/sentry'
import { logger } from './lib/logger';

const log = logger('main');

// Initialize Sentry error tracking before app starts
initSentry()

// Create QueryClient for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (cacheTime is renamed to gcTime in v5)
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

// Create IndexedDB persister for larger storage
const idbPersister = {
  persistClient: async (client: PersistedClient) => {
    await set('react-query', client)
  },
  restoreClient: async () => {
    return await get<PersistedClient>('react-query')
  },
  removeClient: async () => {
    await del('react-query')
  },
}

// Initialize Google Auth when the script is loaded
function initApp() {
  // Wait for Google Identity Services to be available
  const checkGoogle = () => {
    if (typeof google !== 'undefined' && google.accounts) {
      log.info('✅ Google Identity Services loaded');
      initializeGoogleAuth();
    } else {
      log.info('⏳ Waiting for Google Identity Services...');
      setTimeout(checkGoogle, 100);
    }
  };

  // Start checking
  checkGoogle();

  // Render the app
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: idbPersister }}
      >
        <App />
      </PersistQueryClientProvider>
    </StrictMode>,
  );
}

// Start the app
initApp();
