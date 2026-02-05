import { db } from './db';
import type { Note } from '@/types';
import { debug } from './debug';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

const log = logger('note-sync');

// Action type for dispatch function - using generic to avoid type conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NoteAction = any;

 
interface NoteActions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addNote: (note: Note) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateNote: (note: Note) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteNote: (noteId: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reorderNotes: (notes: Note[]) => any;
}

/**
 * Note Sync Helpers
 * Wraps note actions with IndexedDB persistence
 */

/**
 * Add note with IndexedDB persistence
 */
export async function addNoteWithSync(
  note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>,
  dispatch: (action: NoteAction) => void,
  actions: NoteActions
): Promise<void> {
  const now = new Date();
  const fullNote: Note = {
    ...note,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now
  };
  // Add to local state immediately
  dispatch(actions.addNote(fullNote));

  // Also save to IndexedDB so it persists after refresh
  try {
    await db.notes.put({
      ...fullNote,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Note saved to IndexedDB:', fullNote.id);
  } catch (dbError) {
    log.error('Failed to save note to IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Update note with IndexedDB persistence
 */
export async function updateNoteWithSync(
  note: Note,
  dispatch: (action: NoteAction) => void,
  actions: NoteActions
): Promise<void> {
  // Update local state immediately
  dispatch(actions.updateNote(note));

  // Also update in IndexedDB so changes persist after refresh
  try {
    await db.notes.update(note.id, {
      ...note,
      updatedAt: new Date(),
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Note updated in IndexedDB:', note.id);
  } catch (dbError) {
    log.error('Failed to update note in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Delete note with IndexedDB persistence
 */
export async function deleteNoteWithSync(
  noteId: string,
  dispatch: (action: NoteAction) => void,
  actions: NoteActions
): Promise<void> {
  // Delete from local state immediately
  dispatch(actions.deleteNote(noteId));

  // Move to deleted table and delete from main table
  try {
    const note = await db.notes.get(noteId);
    if (note) {
      // Add to deletedNotes table first
      await db.deletedNotes.put({
        ...note,
        originalId: note.id,
        deletedAt: new Date().toISOString()
      });
      // Then delete from main table
      await db.notes.delete(noteId);
      debug.log('🗑️ Note moved to deletedNotes:', noteId);
    }
  } catch (dbError) {
    log.error('Failed to delete note from IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Toggle note pin with IndexedDB persistence
 */
export async function toggleNotePinWithSync(
  note: Note,
  dispatch: (action: NoteAction) => void,
  actions: NoteActions
): Promise<void> {
  const updatedNote = { ...note, isPinned: !note.isPinned };
  
  // Update local state immediately
  dispatch(actions.updateNote(updatedNote));

  // Also update in IndexedDB
  try {
    await db.notes.update(note.id, {
      ...updatedNote,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Note pin toggled in IndexedDB:', note.id);
  } catch (dbError) {
    log.error('Failed to toggle note pin in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Toggle note favorite with IndexedDB persistence
 */
export async function toggleNoteFavoriteWithSync(
  note: Note,
  dispatch: (action: NoteAction) => void,
  actions: NoteActions
): Promise<void> {
  const updatedNote = { ...note, isFavorite: !note.isFavorite };
  
  // Update local state immediately
  dispatch(actions.updateNote(updatedNote));

  // Also update in IndexedDB
  try {
    await db.notes.update(note.id, {
      ...updatedNote,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Note favorite toggled in IndexedDB:', note.id);
  } catch (dbError) {
    log.error('Failed to toggle note favorite in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Reorder notes with IndexedDB persistence
 */
export async function reorderNotesWithSync(
  notes: Note[],
  dispatch: (action: NoteAction) => void,
  actions: NoteActions
): Promise<void> {
  // Update local state immediately
  dispatch(actions.reorderNotes(notes));

  // Also update in IndexedDB
  try {
    for (const note of notes) {
      await db.notes.update(note.id, {
        ...note,
        lastSyncedAt: new Date().toISOString()
      });
    }
    debug.log('💾 Notes reordered in IndexedDB');
  } catch (dbError) {
    log.error('Failed to reorder notes in IndexedDB', dbError instanceof Error ? dbError : new Error(String(dbError)));
  }
}

/**
 * Load notes from IndexedDB into state
 * Call this on app initialization
 */
export async function loadNotesFromDB(
  dispatch: (action: NoteAction) => void,
  actions: NoteActions
): Promise<Note[]> {
  try {
    const notes = await db.notes.toArray();
    
    // Ensure dates are Date objects and dispatch each note to state
    for (const note of notes) {
      const hydratedNote = {
        ...note,
        createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt),
        updatedAt: note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt)
      };
      dispatch(actions.addNote(hydratedNote));
    }
    
    debug.log('✅ Loaded', notes.length, 'notes from IndexedDB');
    return notes;
  } catch (error) {
    log.error('Failed to load notes from IndexedDB', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
