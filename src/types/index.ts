// Calendar Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  color?: string;
  isAllDay?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminder?: number; // minutes before
  calendarId: string;
  googleEventId?: string; // Google Calendar event ID
  syncedFromGoogle?: boolean; // Whether this event was synced from Google Calendar
  // Google Calendar sync metadata
  etag?: string; // Google's version identifier
  recurringEventId?: string; // ID of the master recurring event
  isRecurringInstance?: boolean; // Whether this is an instance of a recurring event
  sourceCalendarId?: string; // Which Google Calendar this came from
  sourceCalendarName?: string;
  sourceCalendarColor?: string;
  lastSyncedAt?: string;
}

// Alias for backward compatibility
export type Event = CalendarEvent;

export interface Calendar {
  id: string;
  name: string;
  color: string;
  isSynced: boolean;
  provider?: 'google' | 'outlook' | 'apple' | 'local';
  events: CalendarEvent[];
}

// Todo Types
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  category?: string;
  createdAt: Date;
  completedAt?: Date;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

// Goal Types
export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  deadline?: Date;
  color: string;
  milestones: Milestone[];
  createdAt: Date;
  category?: string;
}

export interface Milestone {
  id: string;
  title: string;
  targetValue: number;
  isCompleted: boolean;
  completedAt?: Date;
}

// Note Types
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  folder?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  order?: number;
  color?: string; // Card background color
  images?: string[]; // Array of base64 image data URLs
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  picture?: string; // Google profile picture
  preferences: UserPreferences;
  createdAt?: Date;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'auto';
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  defaultCalendarView?: 'day' | 'week' | 'month';
  timeFormat?: '12h' | '24h';
  dateFormat?: string;
  notifications?: boolean;
  startOfWeek?: number;
}

// Dashboard Types
export interface DailyOverview {
  date: Date;
  events: CalendarEvent[];
  todos: Todo[];
  goalsProgress: GoalProgress[];
}

export interface GoalProgress {
  goalId: string;
  goalTitle: string;
  progress: number;
  color: string;
}

// App State
export interface AppState {
  user: User | null;
  calendars: Calendar[];
  todos: Todo[];
  goals: Goal[];
  notes: Note[];
  selectedDate: Date;
  view: 'dashboard' | 'calendar' | 'todos' | 'goals' | 'notes' | 'settings';
  isSidebarOpen: boolean;
  goalsViewMode: 'grid' | 'list';
  notesViewMode: 'grid' | 'list';
  todosViewMode: 'grid' | 'list';
  calendarView: 'month' | 'week' | 'day';
  selectedItemToOpen: { type: 'event' | 'todo' | 'goal' | 'note'; id: string } | null;
}

// Navigation
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
}
