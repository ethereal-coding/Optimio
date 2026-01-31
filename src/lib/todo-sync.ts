import { db } from './db';
import type { Todo } from '@/types';
import { debug } from './debug';
import { notify } from './notifications';

/**
 * Todo Sync Helpers
 * Wraps todo actions with IndexedDB persistence
 */

/**
 * Add todo with IndexedDB persistence
 */
export async function addTodoWithSync(
  todo: Todo,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Add to local state immediately
  dispatch(actions.addTodo(todo));

  // Also save to IndexedDB so it persists after refresh
  try {
    await db.todos.put({
      ...todo,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Todo saved to IndexedDB:', todo.id);
    notify.todoCreated(todo.title);
  } catch (dbError) {
    console.error('Failed to save todo to IndexedDB:', dbError);
    notify.error('Failed to save task');
  }
}

/**
 * Update todo with IndexedDB persistence
 */
export async function updateTodoWithSync(
  todo: Todo,
  dispatch: (action: any) => void,
  actions: any
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
    notify.todoUpdated(todo.title);
  } catch (dbError) {
    console.error('Failed to update todo in IndexedDB:', dbError);
    notify.error('Failed to update task');
  }
}

/**
 * Toggle todo completion with IndexedDB persistence
 */
export async function toggleTodoWithSync(
  todoId: string,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Get todo before toggling to know the new state
  const todo = await db.todos.get(todoId);
  const willBeCompleted = todo ? !todo.completed : true;
  
  // Toggle in local state immediately
  dispatch(actions.toggleTodo(todoId));

  // Also update in IndexedDB
  try {
    if (todo) {
      await db.todos.update(todoId, {
        ...todo,
        completed: willBeCompleted,
        completedAt: willBeCompleted ? new Date() : undefined,
        lastSyncedAt: new Date().toISOString()
      });
      debug.log('💾 Todo toggled in IndexedDB:', todoId);
      
      if (willBeCompleted) {
        notify.todoCompleted(todo.title);
      } else {
        notify.todoUncompleted(todo.title);
      }
    }
  } catch (dbError) {
    console.error('Failed to toggle todo in IndexedDB:', dbError);
    notify.error('Failed to update task');
  }
}

/**
 * Delete todo with IndexedDB persistence
 */
export async function deleteTodoWithSync(
  todoId: string,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Delete from local state immediately
  dispatch(actions.deleteTodo(todoId));

  // Also delete from IndexedDB
  try {
    await db.todos.delete(todoId);
    debug.log('🗑️ Todo deleted from IndexedDB:', todoId);
    notify.todoDeleted();
  } catch (dbError) {
    console.error('Failed to delete todo from IndexedDB:', dbError);
    notify.error('Failed to delete task');
  }
}

/**
 * Load todos from IndexedDB into state
 * Call this on app initialization
 */
export async function loadTodosFromDB(
  dispatch: (action: any) => void,
  actions: any
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
    console.error('Failed to load todos from IndexedDB:', error);
    return [];
  }
}
