import { db } from './db';
import type { Goal } from '@/types';
import { debug } from './debug';
import { notify } from './notifications';

/**
 * Goal Sync Helpers
 * Wraps goal actions with IndexedDB persistence
 */

/**
 * Add goal with IndexedDB persistence
 */
export async function addGoalWithSync(
  goal: Goal,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Add to local state immediately
  dispatch(actions.addGoal(goal));

  // Also save to IndexedDB so it persists after refresh
  try {
    await db.goals.put({
      ...goal,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Goal saved to IndexedDB:', goal.id);
    notify.goalCreated(goal.title);
  } catch (dbError) {
    console.error('Failed to save goal to IndexedDB:', dbError);
    notify.error('Failed to save goal');
  }
}

/**
 * Update goal with IndexedDB persistence
 */
export async function updateGoalWithSync(
  goal: Goal,
  dispatch: (action: any) => void,
  actions: any
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
    notify.goalUpdated(goal.title);
  } catch (dbError) {
    console.error('Failed to update goal in IndexedDB:', dbError);
    notify.error('Failed to update goal');
  }
}

/**
 * Delete goal with IndexedDB persistence
 */
export async function deleteGoalWithSync(
  goalId: string,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Delete from local state immediately
  dispatch(actions.deleteGoal(goalId));

  // Also delete from IndexedDB
  try {
    await db.goals.delete(goalId);
    debug.log('🗑️ Goal deleted from IndexedDB:', goalId);
    notify.goalDeleted();
  } catch (dbError) {
    console.error('Failed to delete goal from IndexedDB:', dbError);
    notify.error('Failed to delete goal');
  }
}

/**
 * Update goal progress with IndexedDB persistence
 */
export async function updateGoalProgressWithSync(
  goalId: string,
  value: number,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Get goal for notification
  const goal = await db.goals.get(goalId);
  
  // Update local state immediately
  dispatch(actions.updateGoalProgress(goalId, value));

  // Also update in IndexedDB
  try {
    if (goal) {
      await db.goals.update(goalId, {
        ...goal,
        currentValue: value,
        lastSyncedAt: new Date().toISOString()
      });
      debug.log('💾 Goal progress updated in IndexedDB:', goalId);
      
      const progress = (value / goal.targetValue) * 100;
      notify.goalProgressUpdated(goal.title, progress);
    }
  } catch (dbError) {
    console.error('Failed to update goal progress in IndexedDB:', dbError);
    notify.error('Failed to update progress');
  }
}

/**
 * Toggle milestone with IndexedDB persistence
 */
export async function toggleMilestoneWithSync(
  goalId: string,
  milestoneId: string,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Get goal and milestone for notification
  const goal = await db.goals.get(goalId);
  const milestone = goal?.milestones.find(m => m.id === milestoneId);
  const willBeCompleted = milestone ? !milestone.isCompleted : true;
  
  // Toggle in local state immediately
  dispatch(actions.toggleMilestone(goalId, milestoneId));

  // Also update in IndexedDB
  try {
    if (goal) {
      const updatedMilestones = goal.milestones.map(m =>
        m.id === milestoneId
          ? { ...m, isCompleted: willBeCompleted, completedAt: willBeCompleted ? new Date() : undefined }
          : m
      );
      await db.goals.update(goalId, {
        ...goal,
        milestones: updatedMilestones,
        lastSyncedAt: new Date().toISOString()
      });
      debug.log('💾 Milestone toggled in IndexedDB:', milestoneId);
      
      if (willBeCompleted && milestone) {
        notify.milestoneCompleted(milestone.title);
      }
    }
  } catch (dbError) {
    console.error('Failed to toggle milestone in IndexedDB:', dbError);
    notify.error('Failed to update milestone');
  }
}

/**
 * Load goals from IndexedDB into state
 * Call this on app initialization
 */
export async function loadGoalsFromDB(
  dispatch: (action: any) => void,
  actions: any
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
    console.error('Failed to load goals from IndexedDB:', error);
    return [];
  }
}
