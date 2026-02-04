import { db } from './db';
import type { SyncableEvent, SyncableTodo, SyncableGoal, SyncableNote } from './db';

export async function moveEventToRecyclingBin(event: SyncableEvent): Promise<void> {
  await db.deletedEvents.add({
    ...event,
    originalId: event.id,
    deletedAt: new Date().toISOString(),
  });
  await db.events.delete(event.id);
}

export async function moveTodoToRecyclingBin(todo: SyncableTodo): Promise<void> {
  await db.deletedTodos.add({
    ...todo,
    originalId: todo.id,
    deletedAt: new Date().toISOString(),
  });
  await db.todos.delete(todo.id);
}

export async function moveGoalToRecyclingBin(goal: SyncableGoal): Promise<void> {
  await db.deletedGoals.add({
    ...goal,
    originalId: goal.id,
    deletedAt: new Date().toISOString(),
  });
  await db.goals.delete(goal.id);
}

export async function moveNoteToRecyclingBin(note: SyncableNote): Promise<void> {
  await db.deletedNotes.add({
    ...note,
    originalId: note.id,
    deletedAt: new Date().toISOString(),
  });
  await db.notes.delete(note.id);
}

// Auto-cleanup items older than 30 days
export async function cleanupOldRecycledItems(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await db.deletedEvents.where('deletedAt').below(thirtyDaysAgo.toISOString()).delete();
  await db.deletedTodos.where('deletedAt').below(thirtyDaysAgo.toISOString()).delete();
  await db.deletedGoals.where('deletedAt').below(thirtyDaysAgo.toISOString()).delete();
  await db.deletedNotes.where('deletedAt').below(thirtyDaysAgo.toISOString()).delete();
}
