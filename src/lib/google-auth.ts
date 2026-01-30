import { db } from './db';
import { debug } from './debug';

/**
 * Google OAuth 2.0 Authentication using Google Identity Services
 * Client-side OAuth flow for Google Calendar integration
 */

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

export interface GoogleAuthTokens {
  accessToken: string;
  expiresAt: number;
  scope: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

let tokenClient: google.accounts.oauth2.TokenClient | null = null;

/**
 * Initialize Google Identity Services
 */
export function initializeGoogleAuth(): void {
  if (typeof google === 'undefined' || !google.accounts) {
    console.error('Google Identity Services not loaded');
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: async (response) => {
      if (response.error) {
        console.error('OAuth error:', response.error);
        throw new Error(response.error);
      }

      // Store tokens
      await db.authTokens.put({
        id: 'google',
        accessToken: response.access_token,
        expiresAt: Date.now() + (parseInt(response.expires_in) * 1000),
        scope: response.scope
      });

      // Fetch and store user info
      await fetchAndStoreUserInfo(response.access_token);

      // Initialize calendar preferences
      await initializeCalendarPreferences(response.access_token);

      debug.log('✅ Google sign-in successful');
      window.location.reload();
    },
  });
}

/**
 * Fetch and store user info
 */
async function fetchAndStoreUserInfo(accessToken: string): Promise<void> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userInfo = await response.json();

    // Store user info in IndexedDB
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
  } catch (error) {
    console.error('Failed to fetch user info:', error);
  }
}

/**
 * Get valid access token (requests new one if expired)
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    const tokens = await db.authTokens.get('google');

    if (!tokens) {
      return null;
    }

    // Check if token is expired (with 5 min buffer)
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000;

    if (tokens.expiresAt < now + bufferMs) {
      debug.log('Access token expired, requesting new token...');
      // For client-side OAuth, we need to request a new token
      // This will be handled by the next sign-in attempt
      await db.authTokens.delete('google');
      return null;
    }

    return tokens.accessToken;
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * Initiate Google OAuth flow
 */
export async function signInWithGoogle(): Promise<void> {
  try {
    if (!GOOGLE_CLIENT_ID) {
      alert(
        'Google Sign-In is not configured.\n\n' +
        'To enable:\n' +
        '1. Create a Google Cloud Project\n' +
        '2. Enable Google Calendar API\n' +
        '3. Create OAuth 2.0 Client ID\n' +
        '4. Add VITE_GOOGLE_CLIENT_ID to your .env file\n' +
        '5. Restart the dev server'
      );
      return;
    }

    // Initialize token client if not already done
    if (!tokenClient) {
      initializeGoogleAuth();
    }

    // Request access token
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  } catch (error) {
    console.error('Sign-in failed:', error);
    throw error;
  }
}

/**
 * Sign out (clear tokens and user data)
 */
export async function signOut(): Promise<void> {
  try {
    const accessToken = await getValidAccessToken();

    // Revoke token with Google
    if (accessToken) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
      });
    }

    // Clear local data
    await db.authTokens.delete('google');
    await db.users.clear();

    debug.log('✅ Signed out successfully');
    window.location.reload();
  } catch (error) {
    console.error('Sign-out failed:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getValidAccessToken();
  return token !== null;
}

/**
 * Get current user info from IndexedDB
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
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * Make authenticated request to Google API
 */
export async function googleApiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in again.');
  }

  return fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Initialize calendar preferences after sign-in
 * Fetches all calendars and stores them with primary enabled by default
 */
async function initializeCalendarPreferences(accessToken: string): Promise<void> {
  try {
    // Fetch calendar list directly using the access token (avoid race condition with IndexedDB)
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar list: ${response.statusText}`);
    }

    const data = await response.json();
    const calendars = data.items || [];

    debug.log(`📅 Found ${calendars.length} calendar(s)`);
    console.log('📅 Calendars found:', calendars); // Always log this

    // Store each calendar as a preference
    for (const calendar of calendars) {
      const existing = await db.calendarPreferences.get(calendar.id);

      if (!existing) {
        // Enable primary calendar and calendars marked as selected in Google Calendar
        const shouldEnable = calendar.primary === true || calendar.selected === true;

        await db.calendarPreferences.put({
          id: calendar.id,
          summary: calendar.summary,
          enabled: shouldEnable,
          color: calendar.backgroundColor || '#3b82f6',
          accessRole: calendar.accessRole,
          primary: calendar.primary
        });

        console.log(`  ${shouldEnable ? '✅' : '⬜'} ${calendar.summary} (${calendar.id})`);
      }
    }

    console.log('✅ Calendar preferences initialized');
    debug.log('✅ Calendar preferences initialized');
  } catch (error) {
    console.error('❌ Failed to initialize calendar preferences:', error);
    // Don't throw - sign-in should still succeed even if this fails
  }
}
