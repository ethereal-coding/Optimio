# 2-Way Google Calendar Sync - Now Active! 🔄

The app now has **full 2-way sync** with Google Calendar. Events sync automatically in both directions.

## How It Works

### 📥 From Google Calendar → App

**Automatic Sync:**
- Initial sync when you sign in
- Syncs every 5 minutes automatically
- Pulls events from your primary Google Calendar
- Events are marked with `syncedFromGoogle: true`

**What Gets Synced:**
- Event title, description, location
- Start and end times
- All-day events
- Event colors (mapped to app colors)
- Google Event IDs (for tracking)

### 📤 From App → Google Calendar

**Automatic Push:**
- When you **create** an event in the app → creates in Google Calendar
- When you **edit** a synced event → updates in Google Calendar
- When you **delete** a synced event → deletes from Google Calendar

**Smart Sync:**
- Local events are saved immediately (offline-first)
- Google sync happens in the background
- If sync fails, events stay in the app
- Synced events get a Google Event ID for tracking

## Using the Sync

### 1. Sign In
1. Click "Sign In" in the header
2. Click "Continue with Google"
3. Grant calendar permissions
4. ✅ You're signed in and syncing!

### 2. Create Events
**In the app:**
- Click the `+` button (bottom right)
- Select Calendar icon
- Fill in event details
- Click "Create Event"
- Event is saved locally AND pushed to Google Calendar

**Result:** Event appears in both the app and Google Calendar!

### 3. Edit Events
**Synced events** (came from Google or were created in app):
- Click on any event
- Click the edit icon
- Make changes
- Click "Save"
- Changes sync to Google Calendar automatically

### 4. Delete Events
**Delete any event:**
- Click on the event
- Click the trash icon
- Confirm deletion
- Event is removed from app AND Google Calendar (if synced)

### 5. View Synced Events
All your Google Calendar events appear in:
- Calendar view (Month/Week/Day)
- Today's Overview widget
- Calendar widget on dashboard

## Sync Status

### Check Sync Status
Events synced from Google have:
- `syncedFromGoogle: true` property
- `googleEventId` property with Google's event ID

### Console Logs
Watch the browser console for sync status:
- `🔄 Syncing from Google Calendar...`
- `✅ Synced N events from Google Calendar`
- `✅ Event created in Google Calendar: [ID]`
- `✅ Event updated in Google Calendar: [ID]`
- `✅ Event deleted from Google Calendar: [ID]`

## Sync Behavior

### What Syncs
✅ Events you create in the app → Google Calendar
✅ Events from Google Calendar → App
✅ Updates to synced events → Both directions
✅ Deletions of synced events → Both directions

### What Doesn't Sync
❌ Events created offline (synced when back online)
❌ Google Calendar recurring events (displays first instance)
❌ Events from non-primary calendars (primary only for now)

### Conflict Resolution
- **Local-first**: Local changes are always saved
- **Background sync**: Google sync happens asynchronously
- **Failure handling**: If Google sync fails, local copy remains
- **No duplicates**: Events are tracked by ID to prevent duplication

## Sync Intervals

- **Initial sync**: On app load (if signed in)
- **Periodic sync**: Every 5 minutes
- **Manual sync**: Happens on sign-in
- **Real-time**: Create/update/delete immediately

## Troubleshooting

### Events not appearing from Google Calendar
1. Check if signed in (click profile in header)
2. Wait up to 5 minutes for next sync
3. Check browser console for sync errors
4. Try signing out and back in

### Events not pushing to Google Calendar
1. Verify you're signed in
2. Check browser console for errors
3. Verify Calendar API permissions were granted
4. Try creating a new event

### Duplicate events
- Events are tracked by ID to prevent duplicates
- If you see duplicates, try refreshing the page
- Check if the same event exists in multiple calendars

### Sync stopped working
1. Check if access token expired (sign in again)
2. Verify Google Calendar API is still enabled
3. Check browser console for auth errors
4. Clear browser cache and sign in again

## Advanced: Manual Sync

If you want to trigger a manual sync:

```typescript
import { syncFromGoogleCalendar } from '@/lib/calendar-sync';

// Sync events from the last 30 days
const now = new Date();
const past = new Date();
past.setDate(now.getDate() - 30);

await syncFromGoogleCalendar('primary', dispatch, actions, {
  timeMin: past,
  timeMax: now,
  mergeWithExisting: true
});
```

## Security & Privacy

- ✅ Tokens stored securely in IndexedDB
- ✅ Tokens never leave your browser
- ✅ Only your primary calendar is accessed
- ✅ You can revoke access anytime from Google Account settings
- ✅ Sign out clears all local data and revokes tokens

## Next Steps

Want to extend the sync?

1. **Multiple calendars**: Sync more than just primary
2. **Recurring events**: Full support for recurrence rules
3. **Push notifications**: Real-time updates from Google
4. **Conflict resolution**: UI for handling sync conflicts
5. **Selective sync**: Choose which calendars to sync

## Files Modified

The following files now include Google Calendar sync:
- `src/sections/Calendar.tsx` - Event create/update/delete with sync
- `src/sections/Dashboard.tsx` - Quick add events with sync
- `src/components/TodayOverview.tsx` - Event update/delete with sync
- `src/App.tsx` - Automatic sync initialization and periodic sync
- `src/lib/calendar-sync.ts` - Sync helper functions (NEW)

## Support

For setup help, see `GOOGLE_CALENDAR_SETUP.md`
For API details, see `app/README_GOOGLE_SYNC.md`

Enjoy your synchronized calendar! 🎉
