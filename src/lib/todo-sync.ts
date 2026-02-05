import { db } from './db';
import type { Todo } from '@/types';
import { debug } from './debug';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

const log = logger('todo-sync');

/** Action type for dispatch function - using generic to avoid type conflicts */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TodoAction = any;

/** Actions object shape - using generic to avoid type conflicts */
 
interface TodoActions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addTodo: (todo: Todo) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateTodo: (todo: Todo) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteTodo: (todoId: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toggleTodo: (todoId: string) => any;
}

/**
 * Todo Sync Helpers
 * Wraps todo actions with IndexedDB persistence
 */

/**
 * Add todo with IndexedDB persistence
 */
export async function addTodoWithSync(
  todo: Omit<Todo, 'id' | 'createdAt'>,
  dispatch: (action: TodoAction) => void,
  actions: TodoActions
): Promise<void> {
  const fullTodo: Todo = {
    ...todo,
    id: uuidv4(),
    createdAt: new Date()
  };
  // Add to local state immediately
  dispatch(actions.addTodo(fullTodo));

  // Also save to IndexedDB so it persists after refresh
  try {
    await db.todos.put({
      ...fullTodo,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Todo saved to IndexedDB:', fullTodo.id);
  } catch (dbError) {
    log.error('Failed to save todo to IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Update todo with IndexedDB persistence
 */
export async function updateTodoWithSync(
  todo: Todo,
  dispatch: (action: TodoAction) => void,
  actions: TodoActions
): Promise<void> {
  // Update local state immediately
  dispatch(actions.updateTodo(todo));

  // Also update in IndexedDB so changes persist after refresh
  try {
    await db.todos.update(todo.id, {
      ...todo,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Todo updated in IndexedDB:', todo.id);
  } catch (dbError) {
    log.error('Failed to update todo in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Toggle todo completion with IndexedDB persistence
 */
export async function toggleTodoWithSync(
  todoId: string,
  dispatch: (action: TodoAction) => void,
  actions: TodoActions
): Promise<void> {
  // Toggle in local state immediately
  dispatch(actions.toggleTodo(todoId));

  // Also update in IndexedDB
  try {
    const todo = await db.todos.get(todoId);
    if (todo) {
      await db.todos.update(todoId, {
        ...todo,
        completed: !todo.completed,
        completedAt: !todo.completed ? new Date() : undefined,
        lastSyncedAt: new Date().toISOString()
      });
      debug.log('💾 Todo toggled in IndexedDB:', todoId);
    }
  } catch (dbError) {
    log.error('Failed to toggle todo in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Delete todo with IndexedDB persistence
 * Also moves todo to deletedTodos table for recycling bin
 */
export async function deleteTodoWithSync(
  todoId: string,
  dispatch: (action: TodoAction) => void,
  actions: TodoActions
): Promise<void> {
  // Delete from local state immediately
  dispatch(actions.deleteTodo(todoId));

  // Move to deleted table and delete from main table
  try {
    const todo = await db.todos.get(todoId);
    if (todo) {
      // Add to deletedTodos table first
      await db.deletedTodos.put({
        ...todo,
        originalId: todo.id,
        deletedAt: new Date().toISOString()
      });
      // Then delete from main table
      await db.todos.delete(todoId);
      debug.log('🗑️ Todo moved to deletedTodos:', todoId);
    }
  } catch (dbError) {
    log.error('Failed to delete todo from IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Load todos from IndexedDB into state
 * Call this on app initialization
 */
export async function loadTodosFromDB(
  dispatch: (action: TodoAction) => void,
  actions: TodoActions
): Promise<Todo[]> {
  try {
    const todos = await db.todos.toArray();
    
    // Dispatch each todo to state
    for (const todo of todos) {
      dispatch(actions.addTodo(todo));
    }
    
    debug.log('✅ Loaded', todos.length, 'todos from IndexedDB');
    return todos;
  } catch (error) {
    log.error('Failed to load todos from IndexedDB', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
