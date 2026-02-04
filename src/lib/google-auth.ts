/**
 * PROFESSIONAL Google OAuth 2.0 Authentication
 * Rule: NEVER auto-trigger OAuth popups. Ever.
 * - User must explicitly click "Sign In" to see OAuth popup
 * - If token expires, user is logged out (no auto-refresh popups)
 * - All auth state is checked silently (no popups)
 */

import { db } from './db';
import { debug } from './debug';
import { encrypt, decrypt, clearEncryptionKey } from './crypto';
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

/**
 * Initialize Google Identity Services (setup only, no auth)
 * This does NOT trigger any popups - just prepares the client
 */
export function initializeGoogleAuth(): Promise<void> {
  if (initPromise) return initPromise;
  if (tokenClient) return Promise.resolve();
  
  if (typeof google === 'undefined' || !google.accounts) {
    console.error('❌ Google Identity Services not loaded');
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
            console.error('❌ OAuth error:', response.error);
            return;
          }
          try {
            await handleSuccessfulAuth(response as google.accounts.oauth2.TokenResponse);
          } catch (error) {
            console.error('❌ Failed to process auth response:', error);
          }
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      log('✅ Google Auth client initialized (no popup)');
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
 * Sign in with Google - ONLY call this when user explicitly clicks "Sign In"
 * This is the ONLY function that should ever trigger an OAuth popup
 */
export async function signIn(): Promise<void> {
  await initializeGoogleAuth();
  
  if (!tokenClient) {
    throw new Error('Token client not initialized');
  }

  log('🔐 User-initiated sign-in...');
  
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
        log('✅ Token revoked with Google');
      } catch (error) {
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
  clearEncryptionKey(); // Clear the encryption key
}

/**
 * Check if user is authenticated
 * IMPORTANT: This function NEVER triggers popups. Ever.
 * It only checks if we have a valid (non-expired) token in storage.
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
      // Token expired - log user out, NO auto-refresh popup
      log('⏰ Token expired, user needs to sign in again');
      await clearAllAuthData();
      window.dispatchEvent(new CustomEvent('auth-state-changed', { 
        detail: { isAuthenticated: false } 
      }));
      return false;
    }

    updateLastVerified();
    return true;
  } catch (error) {
    console.error('Failed to check auth status:', error);
    return false;
  }
}

/**
 * Get valid access token
 * IMPORTANT: This function NEVER triggers popups. Ever.
 * If token is expired, returns null and lets caller handle it.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const tokens = await db.authTokens.get('google');

    if (!tokens) {
      return null;
    }

    // Check if token is expired
    const isExpired = tokens.expiresAt <= Date.now();
    
    if (isExpired) {
      // Token expired - DON'T try to refresh, just return null
      log('⏰ Token expired, returning null (no auto-refresh)');
      return null;
    }

    // Decrypt the token
    const decryptedToken = await decrypt(tokens.accessToken);
    return decryptedToken;
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
