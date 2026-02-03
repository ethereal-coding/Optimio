import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { queueSync } from '@/lib/sync-engine';
import type { CalendarEvent, Todo, Goal, Note } from '@/types';

/**
 * Generic hook for optimistic database operations
 * Provides instant UI feedback while persisting to IndexedDB
 */

// Extended types for optimistic updates
interface OptimisticEvent extends CalendarEvent {
  _optimistic?: boolean;
}

interface OptimisticTodo extends Todo {
  _optimistic?: boolean;
}

interface OptimisticGoal extends Goal {
  _optimistic?: boolean;
}

interface OptimisticNote extends Note {
  _optimistic?: boolean;
}

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load events from IndexedDB
  const loadEvents = useCallback(async () => {
    try {
      const data = await db.events.toArray();
      setEvents(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load events:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Use IIFE to avoid direct setState in effect body
    const init = () => {
      void loadEvents();
    };
    init();
  }, [loadEvents]);

  // Create event (optimistic)
  const createEvent = useCallback(async (event: CalendarEvent) => {
    // 1. Optimistic UI update
    setEvents(prev => [...prev, { ...event, _optimistic: true } as OptimisticEvent]);

    try {
      // 2. Persist to IndexedDB
      await db.events.add({
        ...event,
        syncStatus: 'pending'
      });

      // 3. Queue for sync
      await queueSync('event', event.id, 'CREATE', event);

      // 4. Revalidate
      await loadEvents();
    } catch (error) {
      console.error('Failed to create event:', error);
      // Rollback optimistic update
      setEvents(prev => prev.filter(e => e.id !== event.id));
      throw error;
    }
  }, [loadEvents]);

  // Update event (optimistic)
  const updateEvent = useCallback(async (event: CalendarEvent) => {
    // Store original for rollback
    const original = events.find(e => e.id === event.id);

    // 1. Optimistic UI update
    setEvents(prev => prev.map(e => (e.id === event.id ? event : e)));

    try {
      // 2. Persist to IndexedDB
      await db.events.put({
        ...event,
        syncStatus: 'pending'
      });

      // 3. Queue for sync
      await queueSync('event', event.id, 'UPDATE', event);

      // 4. Revalidate
      await loadEvents();
    } catch (error) {
      console.error('Failed to update event:', error);
      // Rollback
      if (original) {
        setEvents(prev => prev.map(e => (e.id === event.id ? original : e)));
      }
      throw error;
    }
  }, [events, loadEvents]);

  // Delete event (optimistic)
  const deleteEvent = useCallback(async (eventId: string) => {
    // Store original for rollback
    const original = events.find(e => e.id === eventId);

    // 1. Optimistic UI update
    setEvents(prev => prev.filter(e => e.id !== eventId));

    try {
      // 2. Delete from IndexedDB
      await db.events.delete(eventId);

      // 3. Queue for sync
      await queueSync('event', eventId, 'DELETE', { id: eventId });
    } catch (error) {
      console.error('Failed to delete event:', error);
      // Rollback
      if (original) {
        setEvents(prev => [...prev, original]);
      }
      throw error;
    }
  }, [events]);

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refresh: loadEvents
  };
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTodos = useCallback(async () => {
    try {
      const data = await db.todos.toArray();
      setTodos(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load todos:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Use IIFE to avoid direct setState in effect body
    const init = () => {
      void loadTodos();
    };
    init();
  }, [loadTodos]);

  const createTodo = useCallback(async (todo: Todo) => {
    setTodos(prev => [...prev, { ...todo, _optimistic: true } as OptimisticTodo]);

    try {
      await db.todos.add({ ...todo, syncStatus: 'pending' });
      await queueSync('todo', todo.id, 'CREATE', todo);
      await loadTodos();
    } catch (error) {
      console.error('Failed to create todo:', error);
      setTodos(prev => prev.filter(t => t.id !== todo.id));
      throw error;
    }
  }, [loadTodos]);

  const updateTodo = useCallback(async (todo: Todo) => {
    const original = todos.find(t => t.id === todo.id);
    setTodos(prev => prev.map(t => (t.id === todo.id ? todo : t)));

    try {
      await db.todos.put({ ...todo, syncStatus: 'pending' });
      await queueSync('todo', todo.id, 'UPDATE', todo);
      await loadTodos();
    } catch (error) {
      console.error('Failed to update todo:', error);
      if (original) {
        setTodos(prev => prev.map(t => (t.id === todo.id ? original : t)));
      }
      throw error;
    }
  }, [todos, loadTodos]);

  const deleteTodo = useCallback(async (todoId: string) => {
    const original = todos.find(t => t.id === todoId);
    setTodos(prev => prev.filter(t => t.id !== todoId));

    try {
      await db.todos.delete(todoId);
      await queueSync('todo', todoId, 'DELETE', { id: todoId });
    } catch (error) {
      console.error('Failed to delete todo:', error);
      if (original) {
        setTodos(prev => [...prev, original]);
      }
      throw error;
    }
  }, [todos]);

  const toggleTodo = useCallback(async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    const updated = {
      ...todo,
      completed: !todo.completed,
      completedAt: !todo.completed ? new Date() : undefined
    };

    await updateTodo(updated);
  }, [todos, updateTodo]);

  return {
    todos,
    loading,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    refresh: loadTodos
  };
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    try {
      const data = await db.goals.toArray();
      setGoals(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load goals:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Use IIFE to avoid direct setState in effect body
    const init = () => {
      void loadGoals();
    };
    init();
  }, [loadGoals]);

  const createGoal = useCallback(async (goal: Goal) => {
    setGoals(prev => [...prev, { ...goal, _optimistic: true } as OptimisticGoal]);

    try {
      await db.goals.add({ ...goal, syncStatus: 'pending' });
      await queueSync('goal', goal.id, 'CREATE', goal);
      await loadGoals();
    } catch (error) {
      console.error('Failed to create goal:', error);
      setGoals(prev => prev.filter(g => g.id !== goal.id));
      throw error;
    }
  }, [loadGoals]);

  const updateGoal = useCallback(async (goal: Goal) => {
    const original = goals.find(g => g.id === goal.id);
    setGoals(prev => prev.map(g => (g.id === goal.id ? goal : g)));

    try {
      await db.goals.put({ ...goal, syncStatus: 'pending' });
      await queueSync('goal', goal.id, 'UPDATE', goal);
      await loadGoals();
    } catch (error) {
      console.error('Failed to update goal:', error);
      if (original) {
        setGoals(prev => prev.map(g => (g.id === goal.id ? original : g)));
      }
      throw error;
    }
  }, [goals, loadGoals]);

  const deleteGoal = useCallback(async (goalId: string) => {
    const original = goals.find(g => g.id === goalId);
    setGoals(prev => prev.filter(g => g.id !== goalId));

    try {
      await db.goals.delete(goalId);
      await queueSync('goal', goalId, 'DELETE', { id: goalId });
    } catch (error) {
      console.error('Failed to delete goal:', error);
      if (original) {
        setGoals(prev => [...prev, original]);
      }
      throw error;
    }
  }, [goals]);

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    refresh: loadGoals
  };
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    try {
      const data = await db.notes.toArray();
      setNotes(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load notes:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Use IIFE to avoid direct setState in effect body
    const init = () => {
      void loadNotes();
    };
    init();
  }, [loadNotes]);

  const createNote = useCallback(async (note: Note) => {
    setNotes(prev => [...prev, { ...note, _optimistic: true } as OptimisticNote]);

    try {
      await db.notes.add({ ...note, syncStatus: 'pending' });
      await queueSync('note', note.id, 'CREATE', note);
      await loadNotes();
    } catch (error) {
      console.error('Failed to create note:', error);
      setNotes(prev => prev.filter(n => n.id !== note.id));
      throw error;
    }
  }, [loadNotes]);

  const updateNote = useCallback(async (note: Note) => {
    const original = notes.find(n => n.id === note.id);
    setNotes(prev => prev.map(n => (n.id === note.id ? note : n)));

    try {
      await db.notes.put({ ...note, syncStatus: 'pending' });
      await queueSync('note', note.id, 'UPDATE', note);
      await loadNotes();
    } catch (error) {
      console.error('Failed to update note:', error);
      if (original) {
        setNotes(prev => prev.map(n => (n.id === note.id ? original : n)));
      }
      throw error;
    }
  }, [notes, loadNotes]);

  const deleteNote = useCallback(async (noteId: string) => {
    const original = notes.find(n => n.id === noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));

    try {
      await db.notes.delete(noteId);
      await queueSync('note', noteId, 'DELETE', { id: noteId });
    } catch (error) {
      console.error('Failed to delete note:', error);
      if (original) {
        setNotes(prev => [...prev, original]);
      }
      throw error;
    }
  }, [notes]);

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    refresh: loadNotes
  };
}
