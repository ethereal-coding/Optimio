import { db } from './db';
import type { Goal } from '@/types';
import { debug } from './debug';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

const log = logger('goal-sync');

// Action type for dispatch function - using generic to avoid type conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoalAction = any;

 
interface GoalActions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addGoal: (goal: Goal) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateGoal: (goal: Goal) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteGoal: (goalId: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateGoalProgress: (goalId: string, value: number) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toggleMilestone: (goalId: string, milestoneId: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addTaskToGoal: (goalId: string, taskId: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeTaskFromGoal: (goalId: string, taskId: string) => any;
}

/**
 * Goal Sync Helpers
 * Wraps goal actions with IndexedDB persistence
 */

/**
 * Add goal with IndexedDB persistence
 */
export async function addGoalWithSync(
  goal: Omit<Goal, 'id' | 'createdAt'>,
  dispatch: (action: GoalAction) => void,
  actions: GoalActions
): Promise<void> {
  const fullGoal: Goal = {
    ...goal,
    id: uuidv4(),
    createdAt: new Date()
  };
  // Add to local state immediately
  dispatch(actions.addGoal(fullGoal));

  // Also save to IndexedDB so it persists after refresh
  try {
    await db.goals.put({
      ...fullGoal,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Goal saved to IndexedDB:', fullGoal.id);
  } catch (dbError) {
    log.error('Failed to save goal to IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Update goal with IndexedDB persistence
 */
export async function updateGoalWithSync(
  goal: Goal,
  dispatch: (action: GoalAction) => void,
  actions: GoalActions
): Promise<void> {
  // Update local state immediately
  dispatch(actions.updateGoal(goal));

  // Also update in IndexedDB so changes persist after refresh
  try {
    await db.goals.update(goal.id, {
      ...goal,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Goal updated in IndexedDB:', goal.id);
  } catch (dbError) {
    log.error('Failed to update goal in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Delete goal with IndexedDB persistence
 */
export async function deleteGoalWithSync(
  goalId: string,
  dispatch: (action: GoalAction) => void,
  actions: GoalActions
): Promise<void> {
  // Delete from local state immediately
  dispatch(actions.deleteGoal(goalId));

  // Move to deleted table and delete from main table
  try {
    const goal = await db.goals.get(goalId);
    if (goal) {
      // Add to deletedGoals table first
      await db.deletedGoals.put({
        ...goal,
        originalId: goal.id,
        deletedAt: new Date().toISOString()
      });
      // Then delete from main table
      await db.goals.delete(goalId);
      debug.log('🗑️ Goal moved to deletedGoals:', goalId);
    }
  } catch (dbError) {
    log.error('Failed to delete goal from IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Update goal progress with IndexedDB persistence
 */
export async function updateGoalProgressWithSync(
  goalId: string,
  value: number,
  dispatch: (action: GoalAction) => void,
  actions: GoalActions
): Promise<void> {
  // Update local state immediately
  dispatch(actions.updateGoalProgress(goalId, value));

  // Also update in IndexedDB
  try {
    const goal = await db.goals.get(goalId);
    if (goal) {
      await db.goals.update(goalId, {
        ...goal,
        currentValue: value,
        lastSyncedAt: new Date().toISOString()
      });
      debug.log('💾 Goal progress updated in IndexedDB:', goalId);
    }
  } catch (dbError) {
    log.error('Failed to update goal progress in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Toggle milestone with IndexedDB persistence
 */
export async function toggleMilestoneWithSync(
  goalId: string,
  milestoneId: string,
  dispatch: (action: GoalAction) => void,
  actions: GoalActions
): Promise<void> {
  // Toggle in local state immediately
  dispatch(actions.toggleMilestone(goalId, milestoneId));

  // Also update in IndexedDB
  try {
    const goal = await db.goals.get(goalId);
    if (goal) {
      const updatedMilestones = goal.milestones.map(m =>
        m.id === milestoneId
          ? { ...m, isCompleted: !m.isCompleted, completedAt: !m.isCompleted ? new Date() : undefined }
          : m
      );
      await db.goals.update(goalId, {
        ...goal,
        milestones: updatedMilestones,
        lastSyncedAt: new Date().toISOString()
      });
      debug.log('💾 Milestone toggled in IndexedDB:', milestoneId);
    }
  } catch (dbError) {
    log.error('Failed to toggle milestone in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Add task to goal with IndexedDB persistence
 */
export async function addTaskToGoalWithSync(
  goalId: string,
  taskId: string,
  dispatch: (action: GoalAction) => void,
  actions: GoalActions
): Promise<void> {
  dispatch(actions.addTaskToGoal(goalId, taskId));
  
  try {
    const goal = await db.goals.get(goalId);
    if (goal) {
      const taskIds = goal.taskIds || [];
      if (!taskIds.includes(taskId)) {
        await db.goals.update(goalId, {
          ...goal,
          taskIds: [...taskIds, taskId],
          lastSyncedAt: new Date().toISOString()
        });
        debug.log('💾 Task added to goal in IndexedDB:', taskId);
      }
    }
  } catch (dbError) {
    log.error('Failed to add task to goal in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Remove task from goal with IndexedDB persistence
 */
export async function removeTaskFromGoalWithSync(
  goalId: string,
  taskId: string,
  dispatch: (action: GoalAction) => void,
  actions: GoalActions
): Promise<void> {
  dispatch(actions.removeTaskFromGoal(goalId, taskId));
  
  try {
    const goal = await db.goals.get(goalId);
    if (goal) {
      const taskIds = goal.taskIds || [];
      await db.goals.update(goalId, {
        ...goal,
        taskIds: taskIds.filter(id => id !== taskId),
        lastSyncedAt: new Date().toISOString()
      });
      debug.log('💾 Task removed from goal in IndexedDB:', taskId);
    }
  } catch (dbError) {
    log.error('Failed to remove task from goal in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Load goals from IndexedDB into state
 * Call this on app initialization
 */
export async function loadGoalsFromDB(
  dispatch: (action: GoalAction) => void,
  actions: GoalActions
): Promise<Goal[]> {
  try {
    const goals = await db.goals.toArray();
    
    // Dispatch each goal to state
    for (const goal of goals) {
      dispatch(actions.addGoal(goal));
    }
    
    debug.log('✅ Loaded', goals.length, 'goals from IndexedDB');
    return goals;
  } catch (error) {
    log.error('Failed to load goals from IndexedDB', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
