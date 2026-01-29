# Optimio - Personal Workspace & Calendar Manager

A sleek, functional CRM/personal workspace application built with React, TypeScript, and Vite. Features Google Calendar integration with full 2-way sync.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.3-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.5-blue.svg)

## ✨ Features

### 📅 Calendar Management
- Month, Week, and Day views
- Create, edit, and delete events
- Color-coded events
- All-day event support
- Location and description fields

### 🔄 Google Calendar Sync
- **Full 2-way sync** with Google Calendar
- Automatic sync every 5 minutes
- Create events in app → Syncs to Google Calendar
- Update/delete synced events → Changes reflect in Google Calendar
- Pull events from Google Calendar → Appear in app

### ✅ Task Management
- Create and organize tasks
- Priority levels (High, Medium, Low)
- Due dates and categories
- Completion tracking
- Filter by status

### 🎯 Goal Tracking
- Set targets with milestones
- Track progress with visual indicators
- Deadline management
- Category organization
- Grid and list views

### 📝 Notes
- Create and organize notes
- Tagging system
- Pinning and favorites
- Search functionality
- Folder organization

### 🎨 Theme System
- Dark mode (default)
- Light mode
- Auto theme switching
- Custom color schemes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Cloud Project (for Calendar sync)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Add your Google OAuth Client ID to `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## 🔧 Google Calendar Setup

To enable Google Calendar sync, follow the detailed guide:

📖 **[Google Calendar Setup Guide](./GOOGLE_CALENDAR_SETUP.md)**

Quick summary:
1. Create a Google Cloud Project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Add Client ID to `.env`
5. Restart dev server

## 📚 Documentation

- **[2-Way Sync Guide](./2WAY_SYNC_GUIDE.md)** - How to use Google Calendar sync
- **[Google Sync Implementation](./README_GOOGLE_SYNC.md)** - Technical details
- **[Setup Instructions](./GOOGLE_CALENDAR_SETUP.md)** - OAuth configuration

## 🛠️ Tech Stack

- **Framework:** React 18.3
- **Language:** TypeScript 5.5
- **Build Tool:** Vite 5.4
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Date Handling:** date-fns
- **Storage:** IndexedDB (Dexie.js)
- **Icons:** Lucide React
- **Authentication:** Google Identity Services
- **API Integration:** Google Calendar API v3

## 📁 Project Structure

```
app/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── AddEventForm.tsx
│   │   ├── CalendarWidget.tsx
│   │   ├── Header.tsx
│   │   └── ...
│   ├── sections/         # Main app sections
│   │   ├── Calendar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Goals.tsx
│   │   ├── Notes.tsx
│   │   ├── Settings.tsx
│   │   └── Todos.tsx
│   ├── lib/              # Utilities and services
│   │   ├── calendar-sync.ts    # 2-way sync helpers
│   │   ├── google-auth.ts      # OAuth authentication
│   │   ├── google-calendar.ts  # Calendar API
│   │   ├── db.ts              # IndexedDB setup
│   │   └── utils.ts
│   ├── hooks/            # Custom React hooks
│   │   ├── useAppState.tsx
│   │   └── useKeyboardShortcuts.tsx
│   ├── types/            # TypeScript definitions
│   │   ├── index.ts
│   │   └── google.d.ts
│   ├── contexts/         # React contexts
│   │   └── ThemeProvider.tsx
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── public/               # Static assets
├── index.html
├── package.json
└── README.md
```

## 🎮 Usage

### Creating Events
1. Click the `+` button (bottom right)
2. Select the Calendar icon
3. Fill in event details
4. Click "Create Event"
5. Event syncs to Google Calendar automatically!

### Managing Tasks
1. Navigate to Tasks section
2. Click "New Task"
3. Set priority, due date, and category
4. Track completion

### Setting Goals
1. Go to Goals section
2. Click "New Goal"
3. Set target value and milestones
4. Track progress visually

### Taking Notes
1. Open Notes section
2. Click "New Note"
3. Add tags and content
4. Organize in folders

## 🔑 Keyboard Shortcuts

- `Ctrl/Cmd + K` - Open search
- `Ctrl/Cmd + ,` - Open settings

## 🔒 Security

- OAuth tokens stored securely in IndexedDB
- No tokens in localStorage or cookies
- Automatic token refresh
- Token revocation on sign-out
- Client-side OAuth (no backend required)

## 🐛 Troubleshooting

### Google Calendar not syncing
1. Check if signed in
2. Verify `.env` has correct Client ID
3. Check browser console for errors
4. Try signing out and back in

### Build errors
1. Delete `node_modules` and reinstall
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Check Node.js version (18+)

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Radix UI](https://www.radix-ui.com/) - Primitives
- [Lucide](https://lucide.dev/) - Icons
- [Google Calendar API](https://developers.google.com/calendar) - Calendar integration

## 📧 Support

For issues or questions, please open a GitHub issue.

---

Built with ❤️ using React + TypeScript + Vite
