/**
 * Auth State Management
 * Handles persistent login state and token refresh
 */

import { db } from './db';
import { debug } from './debug';

const log = debug.log;

// Auth state constants
const AUTH_STATE_KEY = 'optimio_auth_state';

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  lastVerifiedAt: number;
}

/**
 * Save auth state to localStorage for persistence across sessions
 */
export function saveAuthState(state: AuthState): void {
  try {
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
    log('💾 Auth state saved');
  } catch (error) {
    console.error('Failed to save auth state:', error);
  }
}

/**
 * Load auth state from localStorage
 */
export function loadAuthState(): AuthState | null {
  try {
    const stored = localStorage.getItem(AUTH_STATE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as AuthState;
  } catch (error) {
    console.error('Failed to load auth state:', error);
    return null;
  }
}

/**
 * Clear auth state from localStorage
 */
export function clearAuthState(): void {
  try {
    localStorage.removeItem(AUTH_STATE_KEY);
    log('🗑️ Auth state cleared');
  } catch (error) {
    console.error('Failed to clear auth state:', error);
  }
}

/**
 * Check if we should attempt silent sign-in
 * Returns true if user was previously authenticated and session might still be valid
 */
export function shouldAttemptSilentSignIn(): boolean {
  const state = loadAuthState();
  if (!state?.isAuthenticated) return false;
  
  // Check if last verification was within last 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  return state.lastVerifiedAt > thirtyDaysAgo;
}

/**
 * Update last verified timestamp
 */
export function updateLastVerified(): void {
  const state = loadAuthState();
  if (state) {
    saveAuthState({ ...state, lastVerifiedAt: Date.now() });
  }
}

/**
 * Initialize auth state on app load
 */
export async function initializeAuthState(): Promise<AuthState> {
  // First check if we have valid tokens in IndexedDB
  try {
    const tokens = await db.authTokens.get('google');
    const users = await db.users.toArray();
    
    if (tokens && users.length > 0) {
      const user = users[0];
      const state: AuthState = {
        isAuthenticated: true,
        userId: user.id,
        email: user.email,
        lastVerifiedAt: Date.now(),
      };
      saveAuthState(state);
      log('✅ Auth state initialized from existing session');
      return state;
    }
  } catch (error) {
    console.error('Failed to initialize auth state from DB:', error);
  }
  
  // Check localStorage as fallback
  const stored = loadAuthState();
  if (stored?.isAuthenticated) {
    return stored;
  }
  
  return {
    isAuthenticated: false,
    userId: null,
    email: null,
    lastVerifiedAt: 0,
  };
}
