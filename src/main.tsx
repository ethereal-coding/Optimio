import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { initializeGoogleAuth } from './lib/google-auth'

// Create QueryClient for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

// Initialize Google Auth when the script is loaded
function initApp() {
  // Wait for Google Identity Services to be available
  const checkGoogle = () => {
    if (typeof google !== 'undefined' && google.accounts) {
      console.log('✅ Google Identity Services loaded');
      initializeGoogleAuth();
    } else {
      console.log('⏳ Waiting for Google Identity Services...');
      setTimeout(checkGoogle, 100);
    }
  };

  // Start checking
  checkGoogle();

  // Render the app
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}

// Start the app
initApp();
