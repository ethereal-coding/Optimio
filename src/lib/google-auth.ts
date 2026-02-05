/**
 * PROFESSIONAL Google OAuth 2.0 Authentication
 * Rule: NEVER auto-trigger OAuth popups. Ever.
 * - User must explicitly click "Sign In" to see OAuth popup
 * - If token expires, user is logged out (no auto-refresh popups)
 * - All auth state is checked silently (no popups)
 */

import { db } from './db';
import { logger } from './logger';
import { encrypt, decrypt, clearEncryptionKey } from './crypto';
import { 
  saveAuthState, 
  clearAuthState, 
  updateLastVerified,
  loadAuthState,
  type AuthState 
} from './auth-state';

const log = logger('google-auth');

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

// CSRF Protection: Secure random token for auth-state-changed events
// This prevents malicious scripts from spoofing auth state changes
const AUTH_TOKEN = crypto.randomUUID();

/**
 * Validate that an auth-state-changed event was dispatched by this module
 * @param eventDetail - The event detail object to validate
 * @returns true if the event is authentic, false otherwise
 */
export function validateAuthEvent(eventDetail: { _token?: string }): boolean {
  return eventDetail._token === AUTH_TOKEN;
}

/**
 * Initialize Google Identity Services (setup only, no auth)
 * This does NOT trigger any popups - just prepares the client
 */
export function initializeGoogleAuth(): Promise<void> {
  if (initPromise) return initPromise;
  if (tokenClient) return Promise.resolve();
  
  if (typeof google === 'undefined' || !google.accounts) {
    log.error('❌ Google Identity Services not loaded', new Error('Google Identity Services not loaded'));
    return Promise.reject(new Error('Google Identity Services not loaded'));
  }

  initPromise = new Promise((resolve, reject) => {
    try {
       
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        prompt: '', 
        callback: async (response: { error?: string; access_token?: string; expires_in?: string; scope?: string }) => {
          if (response.error) {
            log.error('❌ OAuth error', new Error(response.error));
            return;
          }
          try {
            await handleSuccessfulAuth(response as google.accounts.oauth2.TokenResponse);
          } catch (error) {
            log.error('❌ Failed to process auth response', error instanceof Error ? error : new Error(String(error)));
          }
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      log.debug('✅ Google Auth client initialized (no popup)');
      resolve();
    } catch (error) {
      log.error('❌ Failed to initialize Google Auth', error instanceof Error ? error : new Error(String(error)));
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
    // Encrypt and store the access token
    const encryptedToken = await encrypt(response.access_token);
    await db.authTokens.put({
      id: 'google',
      accessToken: encryptedToken,
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

    log.info('✅ Auth successful for:', { email: userInfo.email });

    // Fetch calendar list in background
    fetchAndStoreCalendarList(userInfo.id).catch(err => log.error('Failed to fetch calendar list', err instanceof Error ? err : new Error(String(err))));

    // Notify app of auth change (with CSRF protection token)
    window.dispatchEvent(new CustomEvent('auth-state-changed', { 
      detail: { isAuthenticated: true, user: userInfo, _token: AUTH_TOKEN } 
    }));

  } catch (error) {
    log.error('❌ Failed to complete sign-in', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Sign in with Google - ONLY call this when user explicitly clicks "Sign In"
 * This is the ONLY function that should ever trigger an OAuth popup
 */
export async function signIn(): Promise<void> {
  await initializeGoogleAuth();
  
  if (!tokenClient) {
    throw new Error('Token client not initialized');
  }

  log.info('🔐 User-initiated sign-in...');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Sign-in timeout'));
    }, 30000);

    // Store original callback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalCallback = (tokenClient as any).callback;
    
    // Temporarily override callback for this request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tokenClient as any).callback = async (response: { error?: string; access_token?: string; expires_in?: string; scope?: string }) => {
      clearTimeout(timeout);
      
      // Restore original callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tokenClient as any).callback = originalCallback;
      
      if (response.error) {
        reject(new Error(response.error));
        return;
      }

      try {
        await handleSuccessfulAuth(response as google.accounts.oauth2.TokenResponse);
        resolve();
      } catch (error) {
        reject(error);
      }
    };

    // This is the ONLY place we trigger OAuth popup
    tokenClient!.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Sign out - clears all auth data
 */
export async function signOut(): Promise<void> {
  try {
    // Try to get decrypted token for revocation before clearing
    let tokenToRevoke: string | null = null;
    try {
      tokenToRevoke = await getAccessToken();
    } catch {
      // If decryption fails, continue with sign out anyway
    }

    // Clear all auth data
    await clearAllAuthData();

    // Revoke token with Google (optional, doesn't block sign-out)
    if (tokenToRevoke) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenToRevoke}`, {
          method: 'POST'
        });
        log.info('✅ Token revoked with Google');
      } catch (error) {
        log.warn('⚠️ Token revocation failed:', { error: String(error) });
      }
    }

    log.info('✅ Signed out successfully');
    
    // Notify app (with CSRF protection token)
    window.dispatchEvent(new CustomEvent('auth-state-changed', { 
      detail: { isAuthenticated: false, _token: AUTH_TOKEN } 
    }));
    
    // Reload to clear any cached state
    window.location.reload();
  } catch (error) {
    log.error('❌ Sign out failed', error instanceof Error ? error : new Error(String(error)));
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
  clearEncryptionKey(); // Clear the encryption key
}

/**
 * Refresh access token silently (without popup)
 * Uses Google's prompt: 'none' to refresh if user has previously consented
 */
async function refreshTokenSilently(): Promise<boolean> {
  try {
    await initializeGoogleAuth();
    
    if (!tokenClient) {
      return false;
    }

    return new Promise((resolve) => {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalCallback = (tokenClient as any).callback;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tokenClient as any).callback = async (response: { error?: string; access_token?: string; expires_in?: string; scope?: string }) => {
        clearTimeout(timeout);
        // Restore original callback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tokenClient as any).callback = originalCallback;
        
        if (response.error || !response.access_token) {
          log.warn('Silent token refresh failed:', { error: response.error });
          resolve(false);
          return;
        }

        try {
          // Update stored token
          const encryptedToken = await encrypt(response.access_token);
          await db.authTokens.put({
            id: 'google',
            accessToken: encryptedToken,
            expiresAt: Date.now() + (parseInt(response.expires_in || '3600') * 1000),
            scope: response.scope
          });
          
          log.info('✅ Token refreshed silently');
          updateLastVerified();
          resolve(true);
        } catch (error) {
          log.error('Failed to store refreshed token', error instanceof Error ? error : new Error(String(error)));
          resolve(false);
        }
      };

      // Request token with prompt: 'none' for silent refresh
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tokenClient as any).requestAccessToken({ prompt: 'none' });
    });
  } catch (error) {
    log.error('Silent refresh failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Check if user is authenticated
 * If token is expired, attempts silent refresh first
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const tokens = await db.authTokens.get('google');

    if (!tokens) {
      return false;
    }

    // Check if token is expired
    const isExpired = tokens.expiresAt <= Date.now();
    
    if (isExpired) {
      // Try to refresh token silently first
      log.info('⏰ Token expired, attempting silent refresh...');
      const refreshed = await refreshTokenSilently();
      
      if (refreshed) {
        return true;
      }
      
      // Silent refresh failed - log user out
      log.warn('Silent refresh failed, user needs to sign in again');
      await clearAllAuthData();
      window.dispatchEvent(new CustomEvent('auth-state-changed', { 
        detail: { isAuthenticated: false, _token: AUTH_TOKEN } 
      }));
      return false;
    }

    updateLastVerified();
    return true;
  } catch (error) {
    log.error('Failed to check auth status', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get valid access token
 * If token is expired, attempts silent refresh first
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    let tokens = await db.authTokens.get('google');

    if (!tokens) {
      return null;
    }

    // Check if token is expired
    const isExpired = tokens.expiresAt <= Date.now();
    
    if (isExpired) {
      // Try to refresh token silently
      log.info('⏰ Token expired, attempting silent refresh...');
      const refreshed = await refreshTokenSilently();
      
      if (!refreshed) {
        log.warn('Silent refresh failed, returning null');
        return null;
      }
      
      // Get the newly stored token
      tokens = await db.authTokens.get('google');
      if (!tokens) {
        return null;
      }
    }

    // Decrypt the token
    const decryptedToken = await decrypt(tokens.accessToken);
    return decryptedToken;
  } catch (error) {
    log.error('Failed to get access token', error instanceof Error ? error : new Error(String(error)));
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
    log.error('Failed to get current user', error instanceof Error ? error : new Error(String(error)));
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

    log.info(`📅 Found ${calendars.length} calendars`);

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

    log.info(`✅ Stored ${calendars.length} calendars in database`);
  } catch (error) {
    log.error('Failed to fetch calendar list', error instanceof Error ? error : new Error(String(error)));
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
