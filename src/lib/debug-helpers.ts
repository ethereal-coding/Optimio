/**
 * Debug helpers for testing Google Calendar sync
 * Run these in the browser console
 */

import { db } from './db';
import { logger } from './logger';

const log = logger('debug-helpers');
import { isAuthenticated, getAccessToken, getCurrentUser, signIn, signOut } from './google-auth';
import { syncCalendarList, getAllCalendars, getEnabledCalendars } from './calendar-storage';
import { syncAllEvents, getEvents } from './event-sync';

// Expose to window for console access
declare global {
  interface Window {
    debugCRM: typeof debugHelpers;
  }
}

export const debugHelpers = {
  // Auth
  isAuthenticated,
  getAccessToken,
  getCurrentUser,
  signIn,
  signOut,

  // Calendars
  syncCalendarList,
  getAllCalendars,
  getEnabledCalendars,

  // Events
  syncAllEvents,
  getEvents,

  // Database
  db,

  // Quick test
  async testSync() {
    log.info('🧪 Testing Google Calendar sync...\n');

    // 1. Check auth
    log.info('1️⃣ Checking authentication...');
    const authenticated = await isAuthenticated();
    log.info('   Authenticated:', { authenticated });

    if (!authenticated) {
      log.info('   ❌ Not authenticated. Run debugCRM.signIn() first.');
      return;
    }

    // 2. Get user
    log.info('\n2️⃣ Getting current user...');
    const user = await getCurrentUser();
    log.info('   User:', { user });

    // 3. Sync calendar list
    log.info('\n3️⃣ Syncing calendar list...');
    try {
      const calendars = await syncCalendarList();
      log.info('   ✅ Found ' + calendars.length + ' calendars');
      calendars.forEach(cal => {
        log.info(`      - ${cal.summary} (${cal.id}) - Enabled: ${cal.enabled}`);
      });
    } catch (error) {
      log.error('   ❌ Failed to sync calendar list', error instanceof Error ? error : new Error(String(error)));
      return;
    }

    // 4. Get enabled calendars
    log.info('\n4️⃣ Getting enabled calendars...');
    const enabled = await getEnabledCalendars();
    log.info('   Enabled calendars:', { count: enabled.length });
    enabled.forEach(cal => {
      log.info(`      - ${cal.summary} (${cal.id})`);
    });

    // 5. Sync events
    log.info('\n5️⃣ Syncing events...');
    try {
      const result = await syncAllEvents();
      log.info('   ✅ Sync result:', { result });
    } catch (error) {
      log.error('   ❌ Failed to sync events', error instanceof Error ? error : new Error(String(error)));
      return;
    }

    // 6. Get events from DB
    log.info('\n6️⃣ Getting events from database...');
    const events = await getEvents();
    log.info('   Total events in DB:', { count: events.length });
    if (events.length > 0) {
      log.info('   Sample event:');
      log.info('      Title:', { title: events[0].title });
      log.info('      Start:', { startTime: events[0].startTime });
      log.info('      End:', { endTime: events[0].endTime });
      log.info('      Calendar:', { sourceCalendarId: events[0].sourceCalendarId });
    }

    log.info('\n✅ Test complete!');
  },

  // Clear all data
  async clearAll() {
    log.info('🗑️ Clearing all data...');
    await db.events.clear();
    await db.calendars.clear();
    await db.authTokens.clear();
    await db.users.clear();
    log.info('✅ All data cleared. Refresh the page.');
  },

  // Show database stats
  async stats() {
    log.info('📊 Database Stats:');
    log.info('   Events:', { count: await db.events.count() });
    log.info('   Calendars:', { count: await db.calendars.count() });
    log.info('   Todos:', { count: await db.todos.count() });
    log.info('   Goals:', { count: await db.goals.count() });
    log.info('   Notes:', { count: await db.notes.count() });
    log.info('   Users:', { count: await db.users.count() });
    log.info('   Auth Tokens:', { count: await db.authTokens.count() });
  }
};

// Auto-mount to window
if (typeof window !== 'undefined') {
  window.debugCRM = debugHelpers;
  log.info('🔧 Debug helpers loaded! Run debugCRM.testSync() to test Google Calendar sync.');
}
