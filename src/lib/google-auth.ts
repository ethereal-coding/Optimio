/**
 * CLEAN REBUILD - Professional Google OAuth 2.0 Authentication
 * Features:
 * - Persistent login (stay logged in until explicit sign out)
 * - Token refresh before expiration
 * - No popup spam (silent auth when possible)
 * - Clear error handling
 */

import { db } from './db';
import { debug } from './debug';
import { 
  saveAuthState, 
  clearAuthState, 
  updateLastVerified,
  loadAuthState,
  type AuthState 
} from './auth-state';

const log = debug.log;

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

let tokenClient: google.accounts.oauth2.TokenClient | null = null;

let initPromise: Promise<void> | null = null;

// Token refresh buffer (5 minutes before expiry)
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;

/**
 * Initialize Google Identity Services
 * Call this once when the app loads
 */
export function initializeGoogleAuth(): Promise<void> {
  // Return existing promise if already initializing
  if (initPromise) return initPromise;
  
  // Return resolved promise if already initialized
  if (tokenClient) return Promise.resolve();
  
  if (typeof google === 'undefined' || !google.accounts) {
    console.error('❌ Google Identity Services not loaded');
    return Promise.reject(new Error('Google Identity Services not loaded'));
  }

  initPromise = new Promise((resolve, reject) => {
    try {
      log('🔐 Initializing Google Auth...');

      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        prompt: '', // No prompt for silent auth when possible
        callback: async (response) => {
          if (response.error) {
            console.error('❌ OAuth error:', response.error);
            // Don't clear auth state on refresh failures - let user stay logged in
            if (response.error !== 'access_denied') {
              await handleAuthError(response.error);
            }
            return;
          }

          try {
            await handleSuccessfulAuth(response);
          } catch (error) {
            console.error('❌ Failed to process auth response:', error);
          }
        },
      });

      log('✅ Google Auth initialized');
      resolve();
    } catch (error) {
      console.error('❌ Failed to initialize Google Auth:', error);
      reject(error);
    }
  });

  return initPromise;
}

/**
 * Handle successful authentication
 */
async function handleSuccessfulAuth(response: google.accounts.oauth2.TokenResponse): Promise<void> {
  try {
    // Store the access token
    await db.authTokens.put({
      id: 'google',
      accessToken: response.access_token,
      expiresAt: Date.now() + (parseInt(response.expires_in) * 1000),
      scope: response.scope
    });

    // Fetch and store user info
    const userInfo = await fetchUserInfo(response.access_token);
    await db.users.put({
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      preferences: {
        theme: 'dark',
        notifications: true,
        startOfWeek: 0
      },
      createdAt: new Date()
    });

    // Save persistent auth state
    saveAuthState({
      isAuthenticated: true,
      userId: userInfo.id,
      email: userInfo.email,
      lastVerifiedAt: Date.now(),
    });

    log('✅ Auth successful for:', userInfo.email);

    // Fetch calendar list in background
    fetchAndStoreCalendarList(userInfo.id).catch(console.error);

    // Notify app of auth change
    window.dispatchEvent(new CustomEvent('auth-state-changed', { 
      detail: { isAuthenticated: true, user: userInfo } 
    }));

  } catch (error) {
    console.error('❌ Failed to complete sign-in:', error);
    throw error;
  }
}

/**
 * Handle auth errors
 */
async function handleAuthError(error: string): Promise<void> {
  log('⚠️ Auth error:', error);
  
  // Only clear state for serious errors, not transient ones
  if (error === 'access_denied' || error === 'invalid_client') {
    await clearAllAuthData();
    window.dispatchEvent(new CustomEvent('auth-state-changed', { 
      detail: { isAuthenticated: false } 
    }));
  }
}

/**
 * Sign in with Google
 * Opens OAuth consent screen only when necessary
 */
export async function signIn(): Promise<void> {
  await initializeGoogleAuth();
  
  if (!tokenClient) {
    throw new Error('Token client not initialized');
  }

  log('🔐 Starting sign-in flow...');
  
  // Try silent auth first (no prompt)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Sign-in timeout'));
    }, 30000);

    // Store original callback
    const originalCallback = tokenClient!.callback;
    
    // Temporarily override callback for this request
    tokenClient!.callback = async (response) => {
      clearTimeout(timeout);
      
      // Restore original callback
      tokenClient!.callback = originalCallback;
      
      if (response.error) {
        if (response.error === 'access_denied' || response.error === 'user_logged_out') {
          // User needs to see consent screen
          log('Silent auth failed, showing consent screen...');
          tokenClient!.requestAccessToken({ prompt: 'consent' });
          return;
        }
        reject(new Error(response.error));
        return;
      }

      try {
        await handleSuccessfulAuth(response);
        resolve();
      } catch (error) {
        reject(error);
      }
    };

    // Try silent auth first
    tokenClient!.requestAccessToken({ prompt: '' });
  });
}

/**
 * Sign out
 * Clears all auth data from IndexedDB and localStorage
 */
export async function signOut(): Promise<void> {
  try {
    // Get token before clearing (for revocation)
    const tokens = await db.authTokens.get('google');

    // Clear all auth data
    await clearAllAuthData();

    // Revoke token with Google (optional, doesn't block sign-out)
    if (tokens?.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`, {
          method: 'POST'
        });
        log('✅ Token revoked with Google');
      } catch (error) {
        // Don't fail sign-out if revocation fails
        console.warn('⚠️ Token revocation failed:', error);
      }
    }

    log('✅ Signed out successfully');
    
    // Notify app
    window.dispatchEvent(new CustomEvent('auth-state-changed', { 
      detail: { isAuthenticated: false } 
    }));
    
    // Reload to clear any cached state
    window.location.reload();
  } catch (error) {
    console.error('❌ Sign out failed:', error);
    throw error;
  }
}

/**
 * Clear all authentication data
 */
async function clearAllAuthData(): Promise<void> {
  await db.authTokens.delete('google');
  await db.users.clear();
  clearAuthState();
}

/**
 * Check if user is authenticated
 * Validates token and attempts refresh if needed
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const tokens = await db.authTokens.get('google');

    if (!tokens) {
      return false;
    }

    // Check if token needs refresh (within 5 minutes of expiry)
    const needsRefresh = tokens.expiresAt <= Date.now() + TOKEN_REFRESH_BUFFER;

    if (needsRefresh) {
      log('🔄 Token expiring soon, attempting refresh...');
      const refreshed = await attemptTokenRefresh();
      
      if (refreshed) {
        updateLastVerified();
        return true;
      }
      
      // Token refresh failed but we still have a valid token
      // Return true to avoid immediate logout, will retry on next check
      const stillValid = tokens.expiresAt > Date.now();
      return stillValid;
    }

    updateLastVerified();
    return true;
  } catch (error) {
    console.error('Failed to check auth status:', error);
    return false;
  }
}

/**
 * Attempt to refresh the access token silently
 */
async function attemptTokenRefresh(): Promise<boolean> {
  if (!tokenClient) {
    try {
      await initializeGoogleAuth();
    } catch {
      return false;
    }
  }

  return new Promise((resolve) => {
    if (!tokenClient) {
      resolve(false);
      return;
    }

    const timeout = setTimeout(() => {
      resolve(false);
    }, 10000);

    // Store original callback
    const originalCallback = tokenClient.callback;
    
    tokenClient.callback = async (response) => {
      clearTimeout(timeout);
      
      // Restore original callback
      tokenClient!.callback = originalCallback;
      
      if (response.error) {
        log('Token refresh failed:', response.error);
        resolve(false);
        return;
      }

      try {
        // Just update the token, don't fetch user info again
        await db.authTokens.put({
          id: 'google',
          accessToken: response.access_token,
          expiresAt: Date.now() + (parseInt(response.expires_in) * 1000),
          scope: response.scope
        });
        
        log('✅ Token refreshed successfully');
        resolve(true);
      } catch (error) {
        console.error('Failed to store refreshed token:', error);
        resolve(false);
      }
    };

    // Attempt silent refresh
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

/**
 * Get valid access token
 * Automatically refreshes if needed
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const tokens = await db.authTokens.get('google');

    if (!tokens) {
      return null;
    }

    // Check if token needs refresh
    const needsRefresh = tokens.expiresAt <= Date.now() + TOKEN_REFRESH_BUFFER;

    if (needsRefresh) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        const newTokens = await db.authTokens.get('google');
        return newTokens?.accessToken || null;
      }
    }

    return tokens.accessToken;
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * Get current user from IndexedDB
 */
export async function getCurrentUser(): Promise<GoogleUser | null> {
  try {
    const users = await db.users.toArray();
    return users.length > 0 ? {
      id: users[0].id,
      email: users[0].email,
      name: users[0].name,
      picture: users[0].picture
    } : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Fetch user info from Google
 */
async function fetchUserInfo(accessToken: string): Promise<GoogleUser> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture
  };
}

/**
 * Fetch and store calendar list from Google
 */
async function fetchAndStoreCalendarList(userId: string): Promise<void> {
  try {
    const { fetchCalendarList } = await import('./google-calendar');
    const calendars = await fetchCalendarList();

    log(`📅 Found ${calendars.length} calendars`);

    // Store each calendar in the database
    for (const calendar of calendars) {
      await db.calendars.put({
        id: calendar.id,
        summary: calendar.summary,
        description: calendar.description,
        backgroundColor: calendar.backgroundColor || '#3b82f6',
        foregroundColor: calendar.foregroundColor || '#ffffff',
        accessRole: calendar.accessRole,
        primary: calendar.primary || false,
        selected: calendar.selected ?? true,
        enabled: (calendar.primary || calendar.selected) ? 1 : 0,
        userId: userId,
        lastSyncedAt: new Date().toISOString()
      });
    }

    log(`✅ Stored ${calendars.length} calendars in database`);
  } catch (error) {
    console.error('Failed to fetch calendar list:', error);
    // Don't throw - calendar list is not critical
  }
}

/**
 * Make authenticated request to Google API
 */
export async function googleApiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in.');
  }

  return fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
}

// Export auth state types
export type { AuthState };
export { loadAuthState };
