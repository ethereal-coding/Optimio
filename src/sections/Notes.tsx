import { useState, useEffect, useRef } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Search,
  Plus,
  Star,
  Trash2,
  Edit2,
  X,
  Tag,
  Folder,
  Grid3x3,
  List,
  Image
} from 'lucide-react';
import { PinIcon } from '@/components/icons/PinIcon';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { AddNoteForm } from '@/components/AddNoteForm';
import type { Note } from '@/types';
import { addNoteWithSync, updateNoteWithSync, deleteNoteWithSync, toggleNotePinWithSync, toggleNoteFavoriteWithSync, reorderNotesWithSync } from '@/lib/note-sync';
import { GOOGLE_CALENDAR_COLORS } from '@/lib/google-calendar';

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'pinned' | 'favorites';

export function Notes() {
  const { state, dispatch } = useAppState();
  const { notes, notesViewMode } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Auto-open note from search
  useEffect(() => {
    if (state.selectedItemToOpen?.type === 'note') {
      const note = state.notes.find(n => n.id === state.selectedItemToOpen!.id);
      if (note) {
        setSelectedNote(note);
        dispatch(actions.setSelectedItemToOpen(null));
      }
    }
  }, [state.selectedItemToOpen, state.notes, dispatch]);

  // Filter notes based on search and filter mode
  const filteredNotes = notes.filter(note => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === 'pinned') return note.isPinned;
    if (filterMode === 'favorites') return note.isFavorite;
    return true;
  });

  // Separate pinned and unpinned notes
  const pinnedNotes = filteredNotes
    .filter(note => note.isPinned)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const unpinnedNotes = filteredNotes
    .filter(note => !note.isPinned)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleAddNote = async (note: Note) => {
    await addNoteWithSync(note, dispatch, actions);
    setShowAddNote(false);
  };

  const handleUpdateNote = async (note: Note) => {
    await updateNoteWithSync(note, dispatch, actions);
    setEditingNote(null);
    setSelectedNote(note);
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNoteWithSync(noteId, dispatch, actions);
    setSelectedNote(null);
  };

  const handleTogglePin = async (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await toggleNotePinWithSync(note, dispatch, actions);
    if (selectedNote?.id === note.id) {
      setSelectedNote({ ...note, isPinned: !note.isPinned });
    }
  };

  const handleToggleFavorite = async (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await toggleNoteFavoriteWithSync(note, dispatch, actions);
    if (selectedNote?.id === note.id) {
      setSelectedNote({ ...note, isFavorite: !note.isFavorite });
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeNote = notes.find(n => n.id === active.id);
    if (!activeNote) return;

    // Determine which list the note is in
    const activeIsPinned = activeNote.isPinned;
    const overNote = notes.find(n => n.id === over.id);
    if (!overNote || overNote.isPinned !== activeIsPinned) return;

    // Get the relevant list
    const relevantNotes = activeIsPinned ? pinnedNotes : unpinnedNotes;
    const oldIndex = relevantNotes.findIndex(n => n.id === active.id);
    const newIndex = relevantNotes.findIndex(n => n.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the notes
    const reorderedNotes = [...relevantNotes];
    const [movedNote] = reorderedNotes.splice(oldIndex, 1);
    reorderedNotes.splice(newIndex, 0, movedNote);

    // Update order field for all notes in this list
    const updatedNotes = reorderedNotes.map((note, index) => ({
      ...note,
      order: index
    }));

    // Merge with all unfiltered notes
    const allUpdatedNotes = notes.map(note => {
      if (note.isPinned === activeIsPinned && relevantNotes.find(n => n.id === note.id)) {
        return updatedNotes.find(n => n.id === note.id) || note;
      }
      return note;
    });

    await reorderNotesWithSync(allUpdatedNotes, dispatch, actions);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
              <FileText className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Notes</h1>
              <p className="text-xs text-muted-foreground">{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddNote(true)}
            className="bg-white text-black hover:bg-white/90 h-10 px-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:bg-accent focus:border-border focus:ring-0"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterMode('all')}
              className={cn(
                "h-8 text-xs transition-colors",
                filterMode === 'all'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterMode('pinned')}
              className={cn(
                "h-8 text-xs transition-colors",
                filterMode === 'pinned'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <PinIcon className="h-3 w-3 mr-1" />
              Pinned
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterMode('favorites')}
              className={cn(
                "h-8 text-xs transition-colors",
                filterMode === 'favorites'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Star className="h-3 w-3 mr-1" />
              Favorites
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(actions.setNotesViewMode('grid'))}
              className={cn(
                "h-8 w-8 transition-colors",
                notesViewMode === 'grid'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(actions.setNotesViewMode('list'))}
              className={cn(
                "h-8 w-8 transition-colors",
                notesViewMode === 'list'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notes Grid/List */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {pinnedNotes.length === 0 && unpinnedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No notes found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Start by creating your first note'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowAddNote(true)}
                className="bg-white text-black hover:bg-white/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <div>
                  {(filterMode === 'all' || filterMode === 'pinned' || filterMode === 'favorites') && (
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">
                      {filterMode === 'favorites' ? 'Pinned Favorites' : 'Pinned'}
                    </h3>
                  )}
                  <SortableContext
                    items={pinnedNotes.map(n => n.id)}
                    strategy={notesViewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
                  >
                    <div className={cn(
                      notesViewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                        : 'space-y-2 max-w-3xl'
                    )}>
                      {pinnedNotes.map((note) => (
                        <SortableNoteCard
                          key={note.id}
                          note={note}
                          viewMode={notesViewMode}
                          onClick={() => setSelectedNote(note)}
                          onTogglePin={handleTogglePin}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              )}

              {/* Unpinned Notes */}
              {unpinnedNotes.length > 0 && (
                <div>
                  {((filterMode === 'all' && pinnedNotes.length > 0) || filterMode === 'favorites') && (
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">
                      {filterMode === 'favorites' ? 'Favorites' : 'Others'}
                    </h3>
                  )}
                  <SortableContext
                    items={unpinnedNotes.map(n => n.id)}
                    strategy={notesViewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
                  >
                    <div className={cn(
                      notesViewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                        : 'space-y-2 max-w-3xl'
                    )}>
                      {unpinnedNotes.map((note) => (
                        <SortableNoteCard
                          key={note.id}
                          note={note}
                          viewMode={notesViewMode}
                          onClick={() => setSelectedNote(note)}
                          onTogglePin={handleTogglePin}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              )}
            </div>
          </DndContext>
        )}
      </div>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Note</DialogTitle>
          </DialogHeader>
          <AddNoteForm onSubmit={handleAddNote} onCancel={() => setShowAddNote(false)} />
        </DialogContent>
      </Dialog>

      {/* View/Edit Note Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => {
        if (!open) {
          setSelectedNote(null);
          setEditingNote(null);
        }
      }}>
        <DialogContent 
          className="border-border max-w-3xl max-h-[80vh]"
          style={{ backgroundColor: editingNote?.color || selectedNote?.color || 'hsl(var(--card))' }}
          showCloseButton={false}
        >
          {selectedNote && !editingNote && (
            <ViewNoteContent
              note={selectedNote}
              onEdit={() => setEditingNote(selectedNote)}
              onDelete={() => handleDeleteNote(selectedNote.id)}
              onTogglePin={() => handleTogglePin(selectedNote)}
              onToggleFavorite={() => handleToggleFavorite(selectedNote)}
              onClose={() => {
                setSelectedNote(null);
                setEditingNote(null);
              }}
            />
          )}
          {editingNote && (
            <EditNoteContent
              note={editingNote}
              onSave={handleUpdateNote}
              onCancel={() => setEditingNote(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sortable Note Card Component
interface NoteCardProps {
  note: Note;
  viewMode: ViewMode;
  onClick: () => void;
  onTogglePin: (note: Note, e: React.MouseEvent) => void;
  onToggleFavorite: (note: Note, e: React.MouseEvent) => void;
}

function SortableNoteCard(props: NoteCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <NoteCard {...props} />
    </div>
  );
}

function NoteCard({ note, viewMode, onClick, onTogglePin, onToggleFavorite }: NoteCardProps) {
  // Get color style for the note
  const colorStyle = note.color ? { backgroundColor: note.color } : {};
  const hasCustomColor = !!note.color;
  // Check if this is the light Graphite color - if not, use white text
  const isGraphite = note.color === 'hsl(var(--card))';
  const useWhiteText = hasCustomColor && !isGraphite;
  const textClass = useWhiteText ? 'text-white' : 'text-foreground';
  const mutedTextClass = useWhiteText ? 'text-white/70' : 'text-muted-foreground';
  
  if (viewMode === 'list') {
    return (
      <Card
        onClick={onClick}
        style={colorStyle}
        className={cn(
          "p-4 border-border hover:border-border transition-all cursor-pointer group",
          hasCustomColor ? "bg-opacity-20" : "bg-card"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {note.isPinned && <PinIcon className="h-3 w-3 text-muted-foreground fill-white/60" />}
              <h3 className="text-base font-medium text-foreground truncate">{note.title}</h3>
            </div>
            {note.content && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {note.content}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{format(note.updatedAt, 'MMM d, yyyy')}</span>
              {note.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && <span>+{note.tags.length - 3}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              onClick={(e) => onTogglePin(note, e)}
            >
              <PinIcon className={cn("h-4 w-4", note.isPinned && "fill-white text-foreground")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
              onClick={(e) => onToggleFavorite(note, e)}
            >
              <Star className={cn("h-4 w-4", note.isFavorite && "fill-yellow-500 text-yellow-500")} />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      style={colorStyle}
      className={cn(
        "p-4 border-border hover:border-border transition-all cursor-pointer group flex flex-col h-[260px]",
        hasCustomColor ? "bg-opacity-20" : "bg-card"
      )}
    >
      {/* Top: Title only */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className={cn("text-base font-semibold line-clamp-1", textClass)}>
            {note.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 transition-opacity",
              note.isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => onTogglePin(note, e)}
          >
            <PinIcon className={cn("h-4 w-4", note.isPinned && "fill-white")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 text-white/80 hover:text-yellow-500 hover:bg-yellow-500/10 transition-opacity",
              note.isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => onToggleFavorite(note, e)}
          >
            <Star className={cn("h-4 w-4", note.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-white/80")} />
          </Button>
        </div>
      </div>

      {/* Content Preview with Fade */}
      {note.content && (
        <div className="relative mb-auto">
          <p className={cn("text-xs line-clamp-4 leading-relaxed", mutedTextClass)}>
            {note.content}
          </p>
          <div className={cn(
            "absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t pointer-events-none",
            hasCustomColor ? "from-transparent" : "from-card to-transparent"
          )} />
        </div>
      )}

      {/* Date - below content body with separator */}
      <div className={cn("flex items-center gap-1.5 text-[10px] mt-auto pt-2 border-t", useWhiteText ? "border-white/30" : "border-border")}>
        <span>{format(note.createdAt, 'MMM d, yyyy')}</span>
        <span>•</span>
        <span>{formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
      </div>

      {/* Bottom: Folder, Tags, and Image indicator */}
      {(note.folder || note.tags.length > 0 || (note.images && note.images.length > 0)) && (
        <div className={cn("flex items-center gap-2 pt-2 mt-2 border-t", useWhiteText ? "border-white/30" : "border-border")}>
          {note.folder && (
            <>
              <span className={cn("text-[10px] flex items-center gap-1", mutedTextClass)}>
                <Folder className="h-3 w-3" />
                {note.folder}
              </span>
              {(note.tags.length > 0 || (note.images && note.images.length > 0)) && (
                <span className={useWhiteText ? "text-white/30" : "text-muted-foreground/50"}>|</span>
              )}
            </>
          )}
          {note.tags.length > 0 && (
            <>
              <div className="flex items-center gap-1 flex-wrap">
                {note.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className={cn("px-1.5 py-0.5 rounded text-[10px]", useWhiteText ? "bg-white/20 text-white/80" : "bg-secondary text-muted-foreground")}>
                    {tag}
                  </span>
                ))}
                {note.tags.length > 2 && (
                  <span className={cn("text-[10px]", mutedTextClass)}>+{note.tags.length - 2}</span>
                )}
              </div>
              {note.images && note.images.length > 0 && (
                <span className={useWhiteText ? "text-white/30" : "text-muted-foreground/50"}>|</span>
              )}
            </>
          )}
          {note.images && note.images.length > 0 && (
            <span className={cn("text-[10px] flex items-center gap-1", mutedTextClass)}>
              <Image className="h-3 w-3" />
              {note.images.length}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

// View Note Content
interface ViewNoteContentProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
  onClose: () => void;
}

function ViewNoteContent({ note, onEdit, onDelete, onTogglePin, onToggleFavorite }: ViewNoteContentProps) {
  // Check if note has a custom color (not graphite)
  const hasColor = !!note.color;
  const isGraphite = note.color === 'hsl(var(--card))';
  const useWhiteText = hasColor && !isGraphite;
  
  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between gap-4 pt-2">
          <DialogTitle className={cn("text-xl flex-1", useWhiteText ? "text-white" : "text-foreground")}>
            {note.title}
          </DialogTitle>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              onClick={onTogglePin}
            >
              <PinIcon className={cn("h-4 w-4", note.isPinned && "fill-foreground")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-yellow-500 hover:bg-yellow-500/10"
              onClick={onToggleFavorite}
            >
              <Star className={cn("h-4 w-4", note.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-white/80")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-red-500 hover:bg-red-500/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogHeader>

      <div className="max-h-[60vh] pr-4 overflow-y-auto custom-scrollbar pt-2">
        <div className="space-y-3">
          {note.folder && (
            <div className="flex items-center gap-2 text-sm">
              <Folder className={cn("h-4 w-4", useWhiteText ? "text-white/70" : "text-muted-foreground")} />
              <span className={cn(useWhiteText ? "text-white/70" : "text-muted-foreground")}>{note.folder}</span>
            </div>
          )}

          {note.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className={cn("h-4 w-4", useWhiteText ? "text-white/70" : "text-muted-foreground")} />
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs",
                    useWhiteText ? "bg-white/20 text-white/80" : "bg-secondary text-muted-foreground"
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Images */}
          {note.images && note.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {note.images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Note image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(img, '_blank')}
                  style={{ borderColor: useWhiteText ? 'rgba(255,255,255,0.2)' : undefined }}
                />
              ))}
            </div>
          )}

          <div className="prose prose-invert max-w-none pt-2">
            <p className={cn("text-base whitespace-pre-wrap leading-relaxed", useWhiteText ? "text-white/90" : "text-foreground/80")}>
              {note.content}
            </p>
          </div>

          {/* Dates - below content body */}
          <div className={cn("flex items-center gap-4 text-xs pt-3 border-t", useWhiteText ? "text-white/70 border-white/10" : "text-muted-foreground border-border")}>
            <span>Created {format(note.createdAt, 'MMM d, yyyy')}</span>
            <span>•</span>
            <span>Updated {formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </>
  );
}

// Edit Note Content
interface EditNoteContentProps {
  note: Note;
  onSave: (note: Note) => void;
  onCancel: () => void;
}

// Use Google Calendar colors for consistency, with Graphite (matching bg-card) first
const NOTE_COLORS = [
  { name: 'Graphite', value: 'hsl(var(--card))' }, // Matches card background
  ...Object.values(GOOGLE_CALENDAR_COLORS)
    .filter(({ name }) => name !== 'Graphite')
    .map(({ hex, name }) => ({ name, value: hex })),
];

function EditNoteContent({ note, onSave, onCancel }: EditNoteContentProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [folder, setFolder] = useState(note.folder || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(note.tags);
  const [color, setColor] = useState(note.color || 'hsl(var(--card))'); // Default to Graphite
  const [images, setImages] = useState<string[]>(note.images || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if note has a custom color (not graphite)
  const hasColor = !!note.color;
  const isGraphite = note.color === 'hsl(var(--card))';
  const useWhiteText = hasColor && !isGraphite;

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setImages(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...note,
      title: title.trim(),
      content: content.trim(),
      tags,
      folder: folder.trim() || undefined,
      color: color === 'hsl(var(--card))' ? undefined : color, // Don't save graphite as explicit color
      images: images.length > 0 ? images : undefined,
      updatedAt: new Date(),
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className={cn(useWhiteText ? "text-white" : "text-foreground")}>Edit Note</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className={cn(
              "text-lg font-medium focus:border-border focus:ring-0",
              useWhiteText 
                ? "bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                : "bg-background border-border text-foreground placeholder:text-muted-foreground"
            )}
          />
        </div>

        <div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note..."
            rows={8}
            className={cn(
              "focus:border-border focus:ring-0 resize-none",
              useWhiteText 
                ? "bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                : "bg-background border-border text-foreground placeholder:text-muted-foreground"
            )}
          />
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-all",
                  color === c.value ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: c.value || 'hsl(var(--card))' }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-8 px-3",
              useWhiteText 
                ? "border border-white/30 text-white/80 hover:text-white hover:bg-white/20" 
                : "border border-border text-foreground/70 hover:text-foreground hover:bg-accent"
            )}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Images
          </button>
          
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt={`Note image ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="Folder (optional)"
            className={cn(
              "focus:border-border focus:ring-0",
              useWhiteText 
                ? "bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                : "bg-background border-border text-foreground placeholder:text-muted-foreground"
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag and press Enter"
              className={cn(
                "flex-1 focus:border-border focus:ring-0",
                useWhiteText 
                  ? "bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                  : "bg-background border-border text-foreground placeholder:text-muted-foreground"
              )}
            />
            <button 
              type="button" 
              onClick={addTag} 
              className={cn(
                "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 w-10",
                useWhiteText 
                  ? "border border-white/30 text-white/80 hover:text-white hover:bg-white/20" 
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs",
                    useWhiteText 
                      ? "bg-white/20 text-white/80" 
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className={cn("transition-colors", useWhiteText ? "hover:text-red-300" : "hover:text-red-400")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onCancel} 
            className={cn(
              useWhiteText 
                ? "text-white/80 hover:text-white hover:bg-white/20" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim()} className="bg-white text-black hover:bg-white/90">
            Save Changes
          </Button>
        </div>
      </form>
    </>
  );
}


