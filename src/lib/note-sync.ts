import { db } from './db';
import type { Note } from '@/types';
import { debug } from './debug';
import { notify } from './notifications';

/**
 * Note Sync Helpers
 * Wraps note actions with IndexedDB persistence
 */

/**
 * Add note with IndexedDB persistence
 */
export async function addNoteWithSync(
  note: Note,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Add to local state immediately
  dispatch(actions.addNote(note));

  // Also save to IndexedDB so it persists after refresh
  try {
    await db.notes.put({
      ...note,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Note saved to IndexedDB:', note.id);
    notify.noteCreated(note.title);
  } catch (dbError) {
    console.error('Failed to save note to IndexedDB:', dbError);
    notify.error('Failed to save note');
  }
}

/**
 * Update note with IndexedDB persistence
 */
export async function updateNoteWithSync(
  note: Note,
  dispatch: (action: any) => void,
  actions: any
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
    notify.noteUpdated(note.title);
  } catch (dbError) {
    console.error('Failed to update note in IndexedDB:', dbError);
    notify.error('Failed to update note');
  }
}

/**
 * Delete note with IndexedDB persistence
 */
export async function deleteNoteWithSync(
  noteId: string,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  // Delete from local state immediately
  dispatch(actions.deleteNote(noteId));

  // Also delete from IndexedDB
  try {
    await db.notes.delete(noteId);
    debug.log('🗑️ Note deleted from IndexedDB:', noteId);
    notify.noteDeleted();
  } catch (dbError) {
    console.error('Failed to delete note from IndexedDB:', dbError);
    notify.error('Failed to delete note');
  }
}

/**
 * Toggle note pin with IndexedDB persistence
 */
export async function toggleNotePinWithSync(
  note: Note,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  const willBePinned = !note.isPinned;
  const updatedNote = { ...note, isPinned: willBePinned };
  
  // Update local state immediately
  dispatch(actions.updateNote(updatedNote));

  // Also update in IndexedDB
  try {
    await db.notes.update(note.id, {
      ...updatedNote,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Note pin toggled in IndexedDB:', note.id);
    
    if (willBePinned) {
      notify.notePinned(note.title);
    } else {
      notify.noteUnpinned(note.title);
    }
  } catch (dbError) {
    console.error('Failed to toggle note pin in IndexedDB:', dbError);
    notify.error('Failed to update note');
  }
}

/**
 * Toggle note favorite with IndexedDB persistence
 */
export async function toggleNoteFavoriteWithSync(
  note: Note,
  dispatch: (action: any) => void,
  actions: any
): Promise<void> {
  const willBeFavorite = !note.isFavorite;
  const updatedNote = { ...note, isFavorite: willBeFavorite };
  
  // Update local state immediately
  dispatch(actions.updateNote(updatedNote));

  // Also update in IndexedDB
  try {
    await db.notes.update(note.id, {
      ...updatedNote,
      lastSyncedAt: new Date().toISOString()
    });
    debug.log('💾 Note favorite toggled in IndexedDB:', note.id);
    
    if (willBeFavorite) {
      notify.noteFavorited(note.title);
    } else {
      notify.noteUnfavorited(note.title);
    }
  } catch (dbError) {
    console.error('Failed to toggle note favorite in IndexedDB:', dbError);
    notify.error('Failed to update note');
  }
}

/**
 * Reorder notes with IndexedDB persistence
 */
export async function reorderNotesWithSync(
  notes: Note[],
  dispatch: (action: any) => void,
  actions: any
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
    console.error('Failed to reorder notes in IndexedDB:', dbError);
  }
}

/**
 * Load notes from IndexedDB into state
 * Call this on app initialization
 */
export async function loadNotesFromDB(
  dispatch: (action: any) => void,
  actions: any
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
    console.error('Failed to load notes from IndexedDB:', error);
    return [];
  }
}
