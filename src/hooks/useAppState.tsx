import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { 
  Calendar, CalendarEvent, Todo, Goal, Note, User, 
  UserPreferences, AppState 
} from '@/types';

// Initial mock data
const mockUser: User = {
  id: '1',
  name: 'Alex Johnson',
  email: 'alex@example.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  preferences: {
    theme: 'dark',
    weekStartsOn: 1,
    defaultCalendarView: 'week',
    timeFormat: '12h',
    dateFormat: 'MMM dd, yyyy'
  }
};

const mockCalendars: Calendar[] = [
  {
    id: '1',
    name: 'Personal',
    color: '#8b5cf6',
    isSynced: true,
    provider: 'google',
    events: [
      {
        id: 'e1',
        title: 'Team Standup',
        description: 'Daily team sync meeting',
        startTime: new Date(new Date().setHours(9, 0, 0, 0)),
        endTime: new Date(new Date().setHours(9, 30, 0, 0)),
        location: 'Zoom',
        color: '#3b82f6',
        isAllDay: false
      },
      {
        id: 'e2',
        title: 'Lunch with Sarah',
        description: 'Catch up over lunch',
        startTime: new Date(new Date().setHours(12, 0, 0, 0)),
        endTime: new Date(new Date().setHours(13, 0, 0, 0)),
        location: 'Downtown Cafe',
        color: '#22c55e',
        isAllDay: false
      },
      {
        id: 'e3',
        title: 'Project Review',
        description: 'Q1 project review meeting',
        startTime: new Date(new Date().setHours(15, 0, 0, 0)),
        endTime: new Date(new Date().setHours(16, 30, 0, 0)),
        location: 'Conference Room A',
        color: '#f59e0b',
        isAllDay: false
      }
    ]
  },
  {
    id: '2',
    name: 'Work',
    color: '#3b82f6',
    isSynced: true,
    provider: 'outlook',
    events: []
  }
];

const mockTodos: Todo[] = [
  {
    id: 't1',
    title: 'Review quarterly report',
    description: 'Go through the Q1 financial report',
    completed: false,
    priority: 'high',
    dueDate: new Date(),
    category: 'Work',
    createdAt: new Date(Date.now() - 86400000),
    subtasks: [
      { id: 'st1', title: 'Gather data', completed: true },
      { id: 'st2', title: 'Analyze metrics', completed: false }
    ]
  },
  {
    id: 't2',
    title: 'Call dentist for appointment',
    completed: false,
    priority: 'medium',
    dueDate: new Date(Date.now() + 86400000),
    category: 'Personal',
    createdAt: new Date(Date.now() - 172800000)
  },
  {
    id: 't3',
    title: 'Buy groceries',
    completed: true,
    priority: 'low',
    dueDate: new Date(),
    category: 'Personal',
    createdAt: new Date(Date.now() - 259200000),
    completedAt: new Date()
  },
  {
    id: 't4',
    title: 'Prepare presentation slides',
    description: 'Create slides for Friday\'s client meeting',
    completed: false,
    priority: 'high',
    dueDate: new Date(Date.now() + 172800000),
    category: 'Work',
    createdAt: new Date(Date.now() - 43200000)
  },
  {
    id: 't5',
    title: 'Exercise - 30 min run',
    completed: false,
    priority: 'medium',
    dueDate: new Date(),
    category: 'Health',
    createdAt: new Date(Date.now() - 86400000)
  }
];

const mockGoals: Goal[] = [
  {
    id: 'g1',
    title: 'Write a book',
    description: 'Complete my first novel',
    targetValue: 80000,
    currentValue: 51200,
    unit: 'words',
    deadline: new Date('2025-06-30'),
    color: '#8b5cf6',
    milestones: [
      { id: 'm1', title: 'Outline complete', targetValue: 0, isCompleted: true, completedAt: new Date('2025-01-15') },
      { id: 'm2', title: 'First draft 25%', targetValue: 20000, isCompleted: true, completedAt: new Date('2025-02-01') },
      { id: 'm3', title: 'First draft 50%', targetValue: 40000, isCompleted: true, completedAt: new Date('2025-02-20') },
      { id: 'm4', title: 'First draft 75%', targetValue: 60000, isCompleted: false },
      { id: 'm5', title: 'First draft complete', targetValue: 80000, isCompleted: false }
    ],
    createdAt: new Date('2025-01-01'),
    category: 'Creative'
  },
  {
    id: 'g2',
    title: 'Learn Spanish',
    description: 'Reach conversational fluency',
    targetValue: 100,
    currentValue: 45,
    unit: 'lessons',
    deadline: new Date('2025-12-31'),
    color: '#ec4899',
    milestones: [
      { id: 'm6', title: 'Complete basics', targetValue: 20, isCompleted: true },
      { id: 'm7', title: 'Intermediate level', targetValue: 50, isCompleted: false },
      { id: 'm8', title: 'Advanced level', targetValue: 80, isCompleted: false },
      { id: 'm9', title: 'Fluency achieved', targetValue: 100, isCompleted: false }
    ],
    createdAt: new Date('2025-01-01'),
    category: 'Learning'
  },
  {
    id: 'g3',
    title: 'Save for vacation',
    description: 'Save money for summer trip to Japan',
    targetValue: 5000,
    currentValue: 3250,
    unit: 'dollars',
    deadline: new Date('2025-07-01'),
    color: '#22c55e',
    milestones: [
      { id: 'm10', title: 'Flight fund', targetValue: 1500, isCompleted: true },
      { id: 'm11', title: 'Hotel fund', targetValue: 3000, isCompleted: true },
      { id: 'm12', title: 'Spending money', targetValue: 4500, isCompleted: false },
      { id: 'm13', title: 'Goal reached', targetValue: 5000, isCompleted: false }
    ],
    createdAt: new Date('2025-01-01'),
    category: 'Finance'
  }
];

const mockNotes: Note[] = [
  {
    id: 'n1',
    title: 'Book Ideas',
    content: 'Main character should be a detective with a mysterious past. Setting: rainy Seattle. Plot twist: the villain is actually the protagonist\'s long-lost sibling.\n\nKey themes:\n- Redemption\n- Family secrets\n- Justice vs. revenge',
    tags: ['writing', 'creative', 'mystery'],
    createdAt: new Date(Date.now() - 604800000),
    updatedAt: new Date(Date.now() - 86400000),
    folder: 'Writing',
    isPinned: true,
    isFavorite: true
  },
  {
    id: 'n2',
    title: 'Meeting Notes - Product Review',
    content: 'Attendees: John, Sarah, Mike\n\nKey points:\n- Q1 metrics exceeded expectations by 15%\n- New feature rollout scheduled for next month\n- Need to address customer feedback about UI\n\nAction items:\n1. Update roadmap document\n2. Schedule user testing sessions\n3. Prepare marketing materials',
    tags: ['work', 'meeting', 'product'],
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172800000),
    folder: 'Work',
    isPinned: false,
    isFavorite: false
  },
  {
    id: 'n3',
    title: 'Spanish Vocabulary',
    content: 'Common phrases:\n- Buenos días - Good morning\n- ¿Cómo estás? - How are you?\n- Muchas gracias - Thank you very much\n- Hasta luego - See you later\n\nVerbs to practice:\n- Ser (to be)\n- Estar (to be)\n- Tener (to have)\n- Hacer (to do/make)',
    tags: ['spanish', 'learning', 'language'],
    createdAt: new Date(Date.now() - 259200000),
    updatedAt: new Date(Date.now() - 43200000),
    folder: 'Learning',
    isPinned: false,
    isFavorite: true
  },
  {
    id: 'n4',
    title: 'Grocery List',
    content: '- Milk (2%)\n- Eggs (organic)\n- Bread (sourdough)\n- Avocados (3)\n- Chicken breast\n- Spinach\n- Greek yogurt\n- Coffee beans\n- Olive oil',
    tags: ['personal', 'shopping'],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 3600000),
    folder: 'Personal',
    isPinned: false,
    isFavorite: false
  }
];

const initialState: AppState = {
  user: null,
  calendars: mockCalendars,
  todos: mockTodos,
  goals: mockGoals,
  notes: mockNotes,
  selectedDate: new Date(),
  selectedItemToOpen: null,
  view: 'dashboard',
  isSidebarOpen: true,
  goalsViewMode: 'grid',
  notesViewMode: 'grid',
  calendarView: 'month',
  todosViewMode: 'list'
};

// Action Types
type Action =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_CALENDARS'; payload: Calendar[] }
  | { type: 'ADD_EVENT'; payload: { calendarId: string; event: CalendarEvent } }
  | { type: 'UPDATE_EVENT'; payload: { calendarId: string; event: CalendarEvent } }
  | { type: 'DELETE_EVENT'; payload: { calendarId: string; eventId: string } }
  | { type: 'SET_TODOS'; payload: Todo[] }
  | { type: 'ADD_TODO'; payload: Todo }
  | { type: 'UPDATE_TODO'; payload: Todo }
  | { type: 'DELETE_TODO'; payload: string }
  | { type: 'TOGGLE_TODO'; payload: string }
  | { type: 'SET_GOALS'; payload: Goal[] }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'UPDATE_GOAL_PROGRESS'; payload: { goalId: string; value: number } }
  | { type: 'TOGGLE_MILESTONE'; payload: { goalId: string; milestoneId: string } }
  | { type: 'SET_NOTES'; payload: Note[] }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: Note }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'REORDER_NOTES'; payload: Note[] }
  | { type: 'SET_SELECTED_DATE'; payload: Date }
  | { type: 'SET_VIEW'; payload: AppState['view'] }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'UPDATE_USER_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'SET_GOALS_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_NOTES_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_TODOS_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_CALENDAR_VIEW'; payload: 'month' | 'week' | 'day' }
  | { type: 'SET_SELECTED_ITEM_TO_OPEN'; payload: { type: 'event' | 'todo' | 'goal' | 'note'; id: string } | null }
  | { type: 'SET_THEME'; payload: 'dark' | 'light' | 'auto' };

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SET_CALENDARS':
      return { ...state, calendars: action.payload };

    case 'ADD_EVENT':
      return {
        ...state,
        calendars: state.calendars.map(cal =>
          cal.id === action.payload.calendarId
            ? { ...cal, events: [...cal.events, action.payload.event] }
            : cal
        )
      };

    case 'UPDATE_EVENT':
      return {
        ...state,
        calendars: state.calendars.map(cal =>
          cal.id === action.payload.calendarId
            ? {
                ...cal,
                events: cal.events.map(e =>
                  e.id === action.payload.event.id ? action.payload.event : e
                )
              }
            : cal
        )
      };

    case 'DELETE_EVENT':
      return {
        ...state,
        calendars: state.calendars.map(cal =>
          cal.id === action.payload.calendarId
            ? { ...cal, events: cal.events.filter(e => e.id !== action.payload.eventId) }
            : cal
        )
      };

    case 'SET_TODOS':
      return { ...state, todos: action.payload };

    case 'ADD_TODO':
      return { ...state, todos: [...state.todos, action.payload] };

    case 'UPDATE_TODO':
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === action.payload.id ? action.payload : t
        )
      };

    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(t => t.id !== action.payload)
      };

    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === action.payload
            ? { 
                ...t, 
                completed: !t.completed,
                completedAt: !t.completed ? new Date() : undefined
              }
            : t
        )
      };

    case 'SET_GOALS':
      return { ...state, goals: action.payload };

    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.payload] };

    case 'UPDATE_GOAL':
      return {
        ...state,
        goals: state.goals.map(g =>
          g.id === action.payload.id ? action.payload : g
        )
      };

    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter(g => g.id !== action.payload)
      };

    case 'UPDATE_GOAL_PROGRESS':
      return {
        ...state,
        goals: state.goals.map(g =>
          g.id === action.payload.goalId
            ? { ...g, currentValue: action.payload.value }
            : g
        )
      };

    case 'TOGGLE_MILESTONE':
      return {
        ...state,
        goals: state.goals.map(g =>
          g.id === action.payload.goalId
            ? {
                ...g,
                milestones: g.milestones.map(m =>
                  m.id === action.payload.milestoneId
                    ? {
                        ...m,
                        isCompleted: !m.isCompleted,
                        completedAt: !m.isCompleted ? new Date() : undefined
                      }
                    : m
                )
              }
            : g
        )
      };

    case 'SET_NOTES':
      return { ...state, notes: action.payload };

    case 'ADD_NOTE': {
      const isPinned = action.payload.isPinned || false;
      const relevantNotes = state.notes.filter(n => (n.isPinned || false) === isPinned);
      const maxOrder = relevantNotes.length > 0
        ? Math.max(...relevantNotes.map(n => n.order || 0))
        : -1;
      const noteWithOrder = {
        ...action.payload,
        order: maxOrder + 1
      };
      return { ...state, notes: [...state.notes, noteWithOrder] };
    }

    case 'UPDATE_NOTE': {
      const oldNote = state.notes.find(n => n.id === action.payload.id);
      const isPinnedChanged = oldNote && (oldNote.isPinned || false) !== (action.payload.isPinned || false);

      let updatedNote = action.payload;

      // If pinned status changed, assign new order
      if (isPinnedChanged) {
        const isPinned = action.payload.isPinned || false;
        const relevantNotes = state.notes.filter(n =>
          n.id !== action.payload.id && (n.isPinned || false) === isPinned
        );
        const maxOrder = relevantNotes.length > 0
          ? Math.max(...relevantNotes.map(n => n.order || 0))
          : -1;
        updatedNote = {
          ...action.payload,
          order: maxOrder + 1
        };
      }

      return {
        ...state,
        notes: state.notes.map(n =>
          n.id === updatedNote.id ? updatedNote : n
        )
      };
    }

    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.filter(n => n.id !== action.payload)
      };

    case 'REORDER_NOTES':
      return {
        ...state,
        notes: action.payload
      };

    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };

    case 'SET_VIEW':
      return { ...state, view: action.payload };

    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarOpen: !state.isSidebarOpen };

    case 'UPDATE_USER_PREFERENCES':
      return {
        ...state,
        user: state.user
          ? { ...state.user, preferences: { ...state.user.preferences, ...action.payload } }
          : null
      };

    case 'SET_THEME':
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              preferences: {
                ...state.user.preferences,
                theme: action.payload
              }
            }
          : {
              id: 'guest',
              name: 'Guest User',
              email: '',
              avatar: '',
              preferences: {
                theme: action.payload,
                startOfWeek: 0,
                dateFormat: 'MM/dd/yyyy',
                timeFormat: '12h',
                notifications: {
                  email: false,
                  push: false,
                  desktop: false
                }
              }
            }
      };

    case 'SET_GOALS_VIEW_MODE':
      return { ...state, goalsViewMode: action.payload };

    case 'SET_NOTES_VIEW_MODE':
      return { ...state, notesViewMode: action.payload };

    case 'SET_TODOS_VIEW_MODE':
      return { ...state, todosViewMode: action.payload };

    case 'SET_CALENDAR_VIEW':
      return { ...state, calendarView: action.payload };

    case 'SET_SELECTED_ITEM_TO_OPEN':
      return { ...state, selectedItemToOpen: action.payload };

    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Helper methods
  getTodayEvents: () => CalendarEvent[];
  getTodayTodos: () => Todo[];
  getCompletedTodosCount: () => number;
  getTotalTodosCount: () => number;
  getGoalsProgress: () => { goalId: string; goalTitle: string; progress: number; color: string }[];
  getPinnedNotes: () => Note[];
  getRecentNotes: () => Note[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Memoized helper methods
  const getTodayEvents = useCallback(() => {
    const today = new Date(state.selectedDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return state.calendars.flatMap(cal =>
      cal.events.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate >= today && eventDate < tomorrow;
      })
    ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [state.calendars, state.selectedDate]);

  const getTodayTodos = useCallback(() => {
    const today = new Date(state.selectedDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return state.todos.filter(todo => {
      if (!todo.dueDate) return false;
      const dueDate = new Date(todo.dueDate);
      return dueDate >= today && dueDate < tomorrow;
    }).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [state.todos, state.selectedDate]);

  const getCompletedTodosCount = useCallback(() => {
    return state.todos.filter(t => t.completed).length;
  }, [state.todos]);

  const getTotalTodosCount = useCallback(() => {
    return state.todos.length;
  }, [state.todos]);

  const getGoalsProgress = useCallback(() => {
    return state.goals.map(goal => ({
      goalId: goal.id,
      goalTitle: goal.title,
      progress: Math.round((goal.currentValue / goal.targetValue) * 100),
      color: goal.color
    }));
  }, [state.goals]);

  const getPinnedNotes = useCallback(() => {
    return state.notes.filter(n => n.isPinned).slice(0, 3);
  }, [state.notes]);

  const getRecentNotes = useCallback(() => {
    return [...state.notes]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5);
  }, [state.notes]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      getTodayEvents,
      getTodayTodos,
      getCompletedTodosCount,
      getTotalTodosCount,
      getGoalsProgress,
      getPinnedNotes,
      getRecentNotes
    }),
    [
      state,
      dispatch,
      getTodayEvents,
      getTodayTodos,
      getCompletedTodosCount,
      getTotalTodosCount,
      getGoalsProgress,
      getPinnedNotes,
      getRecentNotes
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook
export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

// Action creators
export const actions = {
  setUser: (user: User | null): Action => ({ type: 'SET_USER', payload: user }),
  setCalendars: (calendars: Calendar[]): Action => ({ type: 'SET_CALENDARS', payload: calendars }),
  addEvent: (calendarId: string, event: CalendarEvent): Action => ({ 
    type: 'ADD_EVENT', 
    payload: { calendarId, event } 
  }),
  updateEvent: (calendarId: string, event: CalendarEvent): Action => ({ 
    type: 'UPDATE_EVENT', 
    payload: { calendarId, event } 
  }),
  deleteEvent: (calendarId: string, eventId: string): Action => ({ 
    type: 'DELETE_EVENT', 
    payload: { calendarId, eventId } 
  }),
  setTodos: (todos: Todo[]): Action => ({ type: 'SET_TODOS', payload: todos }),
  addTodo: (todo: Todo): Action => ({ type: 'ADD_TODO', payload: todo }),
  updateTodo: (todo: Todo): Action => ({ type: 'UPDATE_TODO', payload: todo }),
  deleteTodo: (id: string): Action => ({ type: 'DELETE_TODO', payload: id }),
  toggleTodo: (id: string): Action => ({ type: 'TOGGLE_TODO', payload: id }),
  setGoals: (goals: Goal[]): Action => ({ type: 'SET_GOALS', payload: goals }),
  addGoal: (goal: Goal): Action => ({ type: 'ADD_GOAL', payload: goal }),
  updateGoal: (goal: Goal): Action => ({ type: 'UPDATE_GOAL', payload: goal }),
  deleteGoal: (id: string): Action => ({ type: 'DELETE_GOAL', payload: id }),
  updateGoalProgress: (goalId: string, value: number): Action => ({
    type: 'UPDATE_GOAL_PROGRESS',
    payload: { goalId, value }
  }),
  toggleMilestone: (goalId: string, milestoneId: string): Action => ({
    type: 'TOGGLE_MILESTONE',
    payload: { goalId, milestoneId }
  }),
  setNotes: (notes: Note[]): Action => ({ type: 'SET_NOTES', payload: notes }),
  addNote: (note: Note): Action => ({ type: 'ADD_NOTE', payload: note }),
  updateNote: (note: Note): Action => ({ type: 'UPDATE_NOTE', payload: note }),
  deleteNote: (id: string): Action => ({ type: 'DELETE_NOTE', payload: id }),
  reorderNotes: (notes: Note[]): Action => ({ type: 'REORDER_NOTES', payload: notes }),
  setSelectedDate: (date: Date): Action => ({ type: 'SET_SELECTED_DATE', payload: date }),
  setView: (view: AppState['view']): Action => ({ type: 'SET_VIEW', payload: view }),
  toggleSidebar: (): Action => ({ type: 'TOGGLE_SIDEBAR' }),
  updateUserPreferences: (prefs: Partial<UserPreferences>): Action => ({
    type: 'UPDATE_USER_PREFERENCES',
    payload: prefs
  }),
  setTheme: (theme: 'dark' | 'light' | 'auto'): Action => ({
    type: 'SET_THEME',
    payload: theme
  }),
  setGoalsViewMode: (mode: 'grid' | 'list'): Action => ({ type: 'SET_GOALS_VIEW_MODE', payload: mode }),
  setNotesViewMode: (mode: 'grid' | 'list'): Action => ({ type: 'SET_NOTES_VIEW_MODE', payload: mode }),
  setTodosViewMode: (mode: 'grid' | 'list'): Action => ({ type: 'SET_TODOS_VIEW_MODE', payload: mode }),
  setCalendarView: (view: 'month' | 'week' | 'day'): Action => ({ type: 'SET_CALENDAR_VIEW', payload: view }),
  setSelectedItemToOpen: (item: { type: 'event' | 'todo' | 'goal' | 'note'; id: string } | null): Action => ({
    type: 'SET_SELECTED_ITEM_TO_OPEN',
    payload: item
  })
};
