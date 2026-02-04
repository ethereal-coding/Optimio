import { db } from './db';
import type { SyncableTodo, SyncableGoal } from './db';
import { logger } from './logger';

const log = logger('archive');

/**
 * Archive a completed todo
 */
export async function archiveTodo(todo: SyncableTodo): Promise<void> {
  if (!todo.completed || !todo.completedAt) {
    log.warn('Cannot archive todo that is not completed');
    return;
  }

  await db.archivedTodos.add({
    ...todo,
    originalId: todo.id,
    completedAt: todo.completedAt instanceof Date 
      ? todo.completedAt.toISOString() 
      : todo.completedAt,
    archivedAt: new Date().toISOString(),
  });

  await db.todos.delete(todo.id);
  log.info(`Archived todo: ${todo.title}`);
}

/**
 * Archive a completed goal
 */
export async function archiveGoal(goal: SyncableGoal): Promise<void> {
  const isCompleted = goal.currentValue >= goal.targetValue;
  if (!isCompleted) {
    log.warn('Cannot archive goal that is not completed');
    return;
  }

  await db.archivedGoals.add({
    ...goal,
    originalId: goal.id,
    completedAt: new Date().toISOString(),
    archivedAt: new Date().toISOString(),
  });

  await db.goals.delete(goal.id);
  log.info(`Archived goal: ${goal.title}`);
}

/**
 * Check if an item should be auto-archived (completed > 3 days ago)
 */
export function shouldAutoArchive(completedAt: Date | string | undefined): boolean {
  if (!completedAt) return false;
  
  const completed = typeof completedAt === 'string' 
    ? new Date(completedAt) 
    : completedAt;
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  return completed < threeDaysAgo;
}

/**
 * Run auto-archive for all completed items
 * Call this periodically (e.g., on app startup)
 */
export async function runAutoArchive(): Promise<{ 
  archivedTodos: number; 
  archivedGoals: number; 
}> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  let archivedTodos = 0;
  let archivedGoals = 0;

  // Archive old completed todos
  const oldTodos = await db.todos
    .where('completed')
    .equals(1)
    .filter(todo => {
      if (!todo.completedAt) return false;
      const completed = todo.completedAt instanceof Date 
        ? todo.completedAt 
        : new Date(todo.completedAt);
      return completed < threeDaysAgo;
    })
    .toArray();

  for (const todo of oldTodos) {
    await archiveTodo(todo);
    archivedTodos++;
  }

  // Archive old completed goals
  const oldGoals = await db.goals
    .filter(goal => {
      const isCompleted = goal.currentValue >= goal.targetValue;
      if (!isCompleted) return false;
      // Goals don't track completion date, use updated logic
      // For now, archive if all milestones are completed and goal is 100%
      const allMilestonesCompleted = goal.milestones.length === 0 || 
        goal.milestones.every(m => m.isCompleted);
      return isCompleted && allMilestonesCompleted;
    })
    .toArray();

  for (const goal of oldGoals) {
    await archiveGoal(goal);
    archivedGoals++;
  }

  log.info(`Auto-archived ${archivedTodos} todos and ${archivedGoals} goals`);
  
  return { archivedTodos, archivedGoals };
}

/**
 * Restore an archived todo
 */
export async function restoreArchivedTodo(archivedId: string): Promise<void> {
  const archived = await db.archivedTodos.get(archivedId);
  if (!archived) return;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { archivedAt, originalId, completedAt, ...todoData } = archived;
  await db.todos.add({
    ...todoData,
    id: originalId,
    completedAt: completedAt ? new Date(completedAt) : undefined,
  });
  await db.archivedTodos.delete(archivedId);
  log.info(`Restored archived todo: ${todoData.title}`);
}

/**
 * Restore an archived goal
 */
export async function restoreArchivedGoal(archivedId: string): Promise<void> {
  const archived = await db.archivedGoals.get(archivedId);
  if (!archived) return;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { archivedAt, completedAt, originalId, ...goalData } = archived;
  await db.goals.add({
    ...goalData,
    id: originalId,
  });
  await db.archivedGoals.delete(archivedId);
  log.info(`Restored archived goal: ${goalData.title}`);
}

/**
 * Cleanup old archived items (older than 1 year)
 */
export async function cleanupOldArchivedItems(): Promise<void> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  await db.archivedTodos.where('archivedAt').below(oneYearAgo.toISOString()).delete();
  await db.archivedGoals.where('archivedAt').below(oneYearAgo.toISOString()).delete();
  
  log.info('Cleaned up archived items older than 1 year');
}
