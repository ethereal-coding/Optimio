import { db } from './db';
import { debug } from './debug';

/**
 * CLEAN REBUILD - Simple Google OAuth 2.0 Authentication
 * No race conditions, clear error handling
 */

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

/**
 * Initialize Google Identity Services
 * Call this once when the app loads
 */
export function initializeGoogleAuth(): void {
  if (typeof google === 'undefined' || !google.accounts) {
    console.error('❌ Google Identity Services not loaded');
    return;
  }

  debug.log('🔐 Initializing Google Auth...');

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: async (response) => {
      if (response.error) {
        console.error('❌ OAuth error:', response.error);
        return;
      }

      try {
        // Store the access token
        await db.authTokens.put({
          id: 'google',
          accessToken: response.access_token,
          expiresAt: Date.now() + (parseInt(response.expires_in) * 1000),
          scope: response.scope
        });

        console.log('✅ Token stored successfully');

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

        console.log('✅ User info stored:', userInfo.email);

        // Fetch and store calendar list
        await fetchAndStoreCalendarList(userInfo.id);
        console.log('✅ Calendar list synced');

        // Reload the page to show authenticated state
        window.location.reload();
      } catch (error) {
        console.error('❌ Failed to complete sign-in:', error);
      }
    },
  });

  debug.log('✅ Google Auth initialized');
}

/**
 * Sign in with Google
 * Opens OAuth consent screen
 */
export function signIn(): void {
  if (!tokenClient) {
    console.error('❌ Token client not initialized. Call initializeGoogleAuth() first.');
    return;
  }

  console.log('🔐 Starting sign-in flow...');
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

/**
 * Sign out
 * Clears all auth data from IndexedDB
 */
export async function signOut(): Promise<void> {
  try {
    // Get token before clearing (for revocation)
    const tokens = await db.authTokens.get('google');

    // Clear all auth data
    await db.authTokens.delete('google');
    await db.users.clear();
    await db.calendars.clear();
    await db.events.clear();

    // Revoke token with Google (optional, doesn't block sign-out)
    if (tokens?.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`, {
          method: 'POST'
        });
        console.log('✅ Token revoked with Google');
      } catch (error) {
        // Don't fail sign-out if revocation fails
        console.warn('⚠️ Token revocation failed:', error);
      }
    }

    console.log('✅ Signed out successfully');
    window.location.reload();
  } catch (error) {
    console.error('❌ Sign out failed:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const tokens = await db.authTokens.get('google');

    if (!tokens) {
      return false;
    }

    // Check if token is expired (with 5-minute buffer)
    const isExpired = tokens.expiresAt <= Date.now() + (5 * 60 * 1000);

    if (isExpired) {
      console.log('⚠️ Token expired');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to check auth status:', error);
    return false;
  }
}

/**
 * Get valid access token
 * Returns null if not authenticated or token expired
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const tokens = await db.authTokens.get('google');

    if (!tokens) {
      console.log('⚠️ No tokens found');
      return null;
    }

    // Check if token is expired (with 5-minute buffer)
    const isExpired = tokens.expiresAt <= Date.now() + (5 * 60 * 1000);

    if (isExpired) {
      console.log('⚠️ Token expired, please sign in again');
      return null;
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
 * @param accessToken - Valid access token
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
 * @param userId - User ID to associate calendars with
 */
async function fetchAndStoreCalendarList(userId: string): Promise<void> {
  try {
    const { fetchCalendarList } = await import('./google-calendar');
    const calendars = await fetchCalendarList();

    debug.log(`📅 Found ${calendars.length} calendars`);

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
        enabled: calendar.primary || calendar.selected || false, // Enable primary and selected by default
        userId: userId,
        lastSyncedAt: new Date().toISOString()
      });
    }

    debug.log(`✅ Stored ${calendars.length} calendars in database`);
  } catch (error) {
    console.error('Failed to fetch calendar list:', error);
    // Don't throw - calendar list is not critical for initial sign-in
  }
}

/**
 * Make authenticated request to Google API
 * @param endpoint - Full URL to Google API endpoint
 * @param options - Fetch options
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
