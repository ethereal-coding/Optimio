/**
 * Debug helpers for testing Google Calendar sync
 * Run these in the browser console
 */

import { db } from './db';
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
    console.log('🧪 Testing Google Calendar sync...\n');

    // 1. Check auth
    console.log('1️⃣ Checking authentication...');
    const authenticated = await isAuthenticated();
    console.log('   Authenticated:', authenticated);

    if (!authenticated) {
      console.log('   ❌ Not authenticated. Run debugCRM.signIn() first.');
      return;
    }

    // 2. Get user
    console.log('\n2️⃣ Getting current user...');
    const user = await getCurrentUser();
    console.log('   User:', user);

    // 3. Sync calendar list
    console.log('\n3️⃣ Syncing calendar list...');
    try {
      const calendars = await syncCalendarList();
      console.log('   ✅ Found', calendars.length, 'calendars');
      calendars.forEach(cal => {
        console.log(`      - ${cal.summary} (${cal.id}) - Enabled: ${cal.enabled}`);
      });
    } catch (error) {
      console.error('   ❌ Failed:', error);
      return;
    }

    // 4. Get enabled calendars
    console.log('\n4️⃣ Getting enabled calendars...');
    const enabled = await getEnabledCalendars();
    console.log('   Enabled calendars:', enabled.length);
    enabled.forEach(cal => {
      console.log(`      - ${cal.summary} (${cal.id})`);
    });

    // 5. Sync events
    console.log('\n5️⃣ Syncing events...');
    try {
      const result = await syncAllEvents();
      console.log('   ✅ Sync result:', result);
    } catch (error) {
      console.error('   ❌ Failed:', error);
      return;
    }

    // 6. Get events from DB
    console.log('\n6️⃣ Getting events from database...');
    const events = await getEvents();
    console.log('   Total events in DB:', events.length);
    if (events.length > 0) {
      console.log('   Sample event:');
      console.log('      Title:', events[0].title);
      console.log('      Start:', events[0].startTime);
      console.log('      End:', events[0].endTime);
      console.log('      Calendar:', events[0].sourceCalendarId);
    }

    console.log('\n✅ Test complete!');
  },

  // Clear all data
  async clearAll() {
    console.log('🗑️ Clearing all data...');
    await db.events.clear();
    await db.calendars.clear();
    await db.authTokens.clear();
    await db.users.clear();
    console.log('✅ All data cleared. Refresh the page.');
  },

  // Show database stats
  async stats() {
    console.log('📊 Database Stats:');
    console.log('   Events:', await db.events.count());
    console.log('   Calendars:', await db.calendars.count());
    console.log('   Todos:', await db.todos.count());
    console.log('   Goals:', await db.goals.count());
    console.log('   Notes:', await db.notes.count());
    console.log('   Users:', await db.users.count());
    console.log('   Auth Tokens:', await db.authTokens.count());
  }
};

// Auto-mount to window
if (typeof window !== 'undefined') {
  window.debugCRM = debugHelpers;
  console.log('🔧 Debug helpers loaded! Run debugCRM.testSync() to test Google Calendar sync.');
}
