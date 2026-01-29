import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useAppState, actions } from './useAppState';
import type { Todo, CalendarEvent, Goal, Note } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('useAppState', () => {
  describe('Todo Actions', () => {
    it('should add a new todo', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });

      const newTodo: Omit<Todo, 'id' | 'createdAt'> = {
        title: 'Test Todo',
        description: 'Test Description',
        completed: false,
        priority: 'high',
        category: 'Test',
        dueDate: new Date(),
        subtasks: [],
      };

      act(() => {
        result.current.dispatch(actions.addTodo({
          ...newTodo,
          id: 'test-id',
          createdAt: new Date(),
        }));
      });

      expect(result.current.state.todos.some(t => t.title === 'Test Todo')).toBe(true);
    });

    it('should toggle todo completion', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const todoId = result.current.state.todos[0]?.id;

      if (todoId) {
        const initialCompleted = result.current.state.todos[0].completed;

        act(() => {
          result.current.dispatch(actions.toggleTodo(todoId));
        });

        expect(result.current.state.todos.find(t => t.id === todoId)?.completed).toBe(!initialCompleted);
      }
    });

    it('should delete a todo', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const initialCount = result.current.state.todos.length;
      const todoId = result.current.state.todos[0]?.id;

      if (todoId) {
        act(() => {
          result.current.dispatch(actions.deleteTodo(todoId));
        });

        expect(result.current.state.todos.length).toBe(initialCount - 1);
        expect(result.current.state.todos.find(t => t.id === todoId)).toBeUndefined();
      }
    });

    it('should get today todos', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const todayTodos = result.current.getTodayTodos();

      expect(Array.isArray(todayTodos)).toBe(true);
      todayTodos.forEach(todo => {
        expect(todo.dueDate).toBeDefined();
      });
    });

    it('should get completed todos count', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const completedCount = result.current.getCompletedTodosCount();

      expect(typeof completedCount).toBe('number');
      expect(completedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Calendar Actions', () => {
    it('should add a new event', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });

      const newEvent: Omit<CalendarEvent, 'id'> = {
        title: 'Test Event',
        description: 'Test Description',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        location: 'Test Location',
        color: '#8b5cf6',
        isAllDay: false,
        recurrence: 'none',
      };

      act(() => {
        result.current.dispatch(actions.addEvent('1', {
          ...newEvent,
          id: 'test-event-id',
        }));
      });

      const calendar = result.current.state.calendars.find(c => c.id === '1');
      expect(calendar?.events.some(e => e.title === 'Test Event')).toBe(true);
    });

    it('should get today events', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const todayEvents = result.current.getTodayEvents();

      expect(Array.isArray(todayEvents)).toBe(true);
    });
  });

  describe('Goal Actions', () => {
    it('should add a new goal', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });

      const newGoal: Omit<Goal, 'id' | 'createdAt'> = {
        title: 'Test Goal',
        description: 'Test Description',
        targetValue: 100,
        currentValue: 50,
        unit: 'items',
        deadline: new Date('2025-12-31'),
        color: '#8b5cf6',
        milestones: [],
        category: 'Test',
      };

      act(() => {
        result.current.dispatch(actions.addGoal({
          ...newGoal,
          id: 'test-goal-id',
          createdAt: new Date(),
        }));
      });

      expect(result.current.state.goals.some(g => g.title === 'Test Goal')).toBe(true);
    });

    it('should update goal progress', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const goalId = result.current.state.goals[0]?.id;

      if (goalId) {
        act(() => {
          result.current.dispatch(actions.updateGoalProgress(goalId, 75));
        });

        expect(result.current.state.goals.find(g => g.id === goalId)?.currentValue).toBe(75);
      }
    });

    it('should get goals progress', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const goalsProgress = result.current.getGoalsProgress();

      expect(Array.isArray(goalsProgress)).toBe(true);
      goalsProgress.forEach(progress => {
        expect(progress).toHaveProperty('goalId');
        expect(progress).toHaveProperty('goalTitle');
        expect(progress).toHaveProperty('progress');
        expect(progress).toHaveProperty('color');
        expect(typeof progress.progress).toBe('number');
      });
    });
  });

  describe('Note Actions', () => {
    it('should add a new note', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });

      const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
        title: 'Test Note',
        content: 'Test Content',
        tags: ['test', 'note'],
        folder: 'Test',
        isPinned: false,
        isFavorite: false,
      };

      act(() => {
        result.current.dispatch(actions.addNote({
          ...newNote,
          id: 'test-note-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      });

      expect(result.current.state.notes.some(n => n.title === 'Test Note')).toBe(true);
    });

    it('should update a note', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const note = result.current.state.notes[0];

      if (note) {
        act(() => {
          result.current.dispatch(actions.updateNote({
            ...note,
            title: 'Updated Title',
          }));
        });

        expect(result.current.state.notes.find(n => n.id === note.id)?.title).toBe('Updated Title');
      }
    });

    it('should delete a note', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const initialCount = result.current.state.notes.length;
      const noteId = result.current.state.notes[0]?.id;

      if (noteId) {
        act(() => {
          result.current.dispatch(actions.deleteNote(noteId));
        });

        expect(result.current.state.notes.length).toBe(initialCount - 1);
      }
    });

    it('should get pinned notes', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const pinnedNotes = result.current.getPinnedNotes();

      expect(Array.isArray(pinnedNotes)).toBe(true);
      pinnedNotes.forEach(note => {
        expect(note.isPinned).toBe(true);
      });
    });

    it('should get recent notes', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const recentNotes = result.current.getRecentNotes();

      expect(Array.isArray(recentNotes)).toBe(true);
      expect(recentNotes.length).toBeLessThanOrEqual(5);
    });
  });

  describe('UI State Actions', () => {
    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const initialState = result.current.state.isSidebarOpen;

      act(() => {
        result.current.dispatch(actions.toggleSidebar());
      });

      expect(result.current.state.isSidebarOpen).toBe(!initialState);
    });

    it('should set selected date', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const newDate = new Date('2025-06-15');

      act(() => {
        result.current.dispatch(actions.setSelectedDate(newDate));
      });

      expect(result.current.state.selectedDate.toISOString()).toBe(newDate.toISOString());
    });

    it('should set view', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });

      act(() => {
        result.current.dispatch(actions.setView('calendar'));
      });

      expect(result.current.state.view).toBe('calendar');
    });
  });

  describe('View Mode Actions', () => {
    it('should set goals view mode to grid', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });

      act(() => {
        result.current.dispatch(actions.setGoalsViewMode('grid'));
      });

      expect(result.current.state.goalsViewMode).toBe('grid');
    });

    it('should set goals view mode to list', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });

      act(() => {
        result.current.dispatch(actions.setGoalsViewMode('list'));
      });

      expect(result.current.state.goalsViewMode).toBe('list');
    });

    it('should set notes view mode', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });

      act(() => {
        result.current.dispatch(actions.setNotesViewMode('list'));
      });

      expect(result.current.state.notesViewMode).toBe('list');
    });

    it('should set todos view mode', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });

      act(() => {
        result.current.dispatch(actions.setTodosViewMode('grid'));
      });

      expect(result.current.state.todosViewMode).toBe('grid');
    });

    it('should persist view mode when switching views', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });

      // Set goals to list mode
      act(() => {
        result.current.dispatch(actions.setGoalsViewMode('list'));
      });

      expect(result.current.state.goalsViewMode).toBe('list');

      // Switch to a different view
      act(() => {
        result.current.dispatch(actions.setView('notes'));
      });

      // Switch back to goals
      act(() => {
        result.current.dispatch(actions.setView('goals'));
      });

      // View mode should still be list
      expect(result.current.state.goalsViewMode).toBe('list');
    });
  });

  describe('Event Editing', () => {
    it('should update an existing event', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const calendar = result.current.state.calendars[0];
      const existingEvent = calendar?.events[0];

      if (existingEvent && calendar) {
        const updatedEvent: CalendarEvent = {
          ...existingEvent,
          title: 'Updated Event Title',
          description: 'Updated description',
        };

        act(() => {
          result.current.dispatch(actions.updateEvent(calendar.id, updatedEvent));
        });

        const updatedCalendar = result.current.state.calendars.find(c => c.id === calendar.id);
        const event = updatedCalendar?.events.find(e => e.id === existingEvent.id);

        expect(event?.title).toBe('Updated Event Title');
        expect(event?.description).toBe('Updated description');
      }
    });

    it('should preserve event ID when updating', () => {
      const { result } = renderHook(() => useAppState(), { wrapper });
      const calendar = result.current.state.calendars[0];
      const existingEvent = calendar?.events[0];

      if (existingEvent && calendar) {
        const originalId = existingEvent.id;
        const updatedEvent: CalendarEvent = {
          ...existingEvent,
          title: 'New Title',
        };

        act(() => {
          result.current.dispatch(actions.updateEvent(calendar.id, updatedEvent));
        });

        const updatedCalendar = result.current.state.calendars.find(c => c.id === calendar.id);
        const event = updatedCalendar?.events.find(e => e.id === originalId);

        expect(event).toBeDefined();
        expect(event?.id).toBe(originalId);
      }
    });
  });
});
