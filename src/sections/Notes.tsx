import { useState, useEffect, useRef } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import {
  Button,
  Input,
  Textarea,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
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
  useSortable,
} from '@dnd-kit/sortable';
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
  Image
} from 'lucide-react';
import { PinIcon } from '@/components/icons/PinIcon';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { AddNoteForm } from '@/components/forms/AddNoteForm';
import type { Note } from '@/types';
import { addNoteWithSync, updateNoteWithSync, deleteNoteWithSync, toggleNotePinWithSync, toggleNoteFavoriteWithSync, reorderNotesWithSync } from '@/lib/note-sync';
import type { DragEndEvent } from '@dnd-kit/core';
import { GOOGLE_CALENDAR_COLORS } from '@/lib/google-calendar';

type FilterMode = 'all' | 'recent' | 'pinned' | 'favorites';

export function Notes() {
  const { state, dispatch } = useAppState();
  const { notes } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-open note from search - use setTimeout to defer state update and avoid cascading render
  useEffect(() => {
    if (state.selectedItemToOpen?.type === 'note') {
      const itemId = state.selectedItemToOpen.id;
      const note = state.notes.find(n => n.id === itemId);
      if (note) {
        // Defer state update to avoid cascading render
        const timer = setTimeout(() => {
          setSelectedNote(note);
          dispatch(actions.setSelectedItemToOpen(null));
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [state.selectedItemToOpen, state.notes, dispatch]);

  // Add/remove dragging class to body
  useEffect(() => {
    if (isDragging) {
      document.body.classList.add('dragging');
    } else {
      document.body.classList.remove('dragging');
    }
    return () => {
      document.body.classList.remove('dragging');
    };
  }, [isDragging]);

  // Filter notes based on search and filter mode
  const filteredNotes = notes.filter(note => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === 'pinned') return note.isPinned;
    if (filterMode === 'favorites') return note.isFavorite;
    if (filterMode === 'recent') {
      // Show notes updated in the last 7 days
      // eslint-disable-next-line react-hooks/purity
      return new Date(note.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
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

  const handleDragEnd = async (event: DragEndEvent) => {
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
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 h-auto min-h-[100px] border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
            <FileText className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Notes</h1>
            <p className="text-xs text-muted-foreground">{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}</p>
          </div>
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
              className="pl-9 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-md hover:border-border-strong focus:border-border-strong hover:bg-secondary/20 transition-colors shadow-none"
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
                  ? 'bg-white/75 border border-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterMode('recent')}
              className={cn(
                "h-8 text-xs transition-colors",
                filterMode === 'recent'
                  ? 'bg-white/75 border border-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              Recent
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterMode('pinned')}
              className={cn(
                "h-8 text-xs transition-colors",
                filterMode === 'pinned'
                  ? 'bg-white/75 border border-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              Pinned
            </Button>
          </div>

          {/* New Note Button */}
          <Button
            onClick={() => setShowAddNote(true)}
            className="bg-white/75 border border-white text-neutral-950 hover:bg-white hover:border-white h-10 px-4 ml-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>

      {/* Notes Grid/List */}
      <div className="flex-1 p-6 pb-10 overflow-y-auto custom-scrollbar">
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
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(e) => {
              setIsDragging(false);
              handleDragEnd(e);
            }}
            autoScroll={false}
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
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {pinnedNotes.map((note) => (
                        <SortableNoteCard
                          key={note.id}
                          note={note}
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
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {unpinnedNotes.map((note) => (
                        <SortableNoteCard
                          key={note.id}
                          note={note}
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
          className={cn(
            "max-w-3xl max-h-[80vh]",
            ((editingNote?.color && editingNote?.color !== 'hsl(var(--card))') || 
             (selectedNote?.color && selectedNote?.color !== 'hsl(var(--card))'))
              ? "border-2"
              : "border border-border"
          )}
          style={{ 
            backgroundColor: editingNote?.color || selectedNote?.color || 'hsl(var(--card))',
            borderColor: ((editingNote?.color && editingNote?.color !== 'hsl(var(--card))') || 
             (selectedNote?.color && selectedNote?.color !== 'hsl(var(--card))')) 
              ? editingNote?.color || selectedNote?.color 
              : undefined
          }}
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
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none h-fit">
      <NoteCard {...props} />
    </div>
  );
}

function NoteCard({ note, onClick, onTogglePin, onToggleFavorite }: NoteCardProps) {
  // Get color style for the note
  const hasCustomColor = !!note.color;
  // Check if this is the light Graphite color - if not, use white text
  const isGraphite = note.color === 'hsl(var(--card))';
  const useWhiteText = hasCustomColor && !isGraphite;
  const textClass = useWhiteText ? 'text-white' : 'text-foreground';
  const mutedTextClass = useWhiteText ? 'text-white/70' : 'text-muted-foreground';
  
  // Check if content overflows 8 lines
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  
  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        setIsOverflowing(contentRef.current.scrollHeight > 154); // detect if more than 8 lines
      }
    };
    const rafId = requestAnimationFrame(checkOverflow);
    return () => cancelAnimationFrame(rafId);
  }, [note.content]);
  
  return (
    <Card
      onClick={onClick}
      style={{
        backgroundColor: hasCustomColor ? `${note.color}CC` : undefined, // CC = 80% opacity in hex
        borderColor: hasCustomColor ? note.color : undefined // 100% opacity for border
      }}
      className={cn(
        "p-4 transition-all cursor-pointer group flex flex-col shadow-none gap-1 h-[280px]",
        hasCustomColor 
          ? "border-2 hover:brightness-110" 
          : "border border-border hover:bg-secondary/50",
        !hasCustomColor && "bg-card"
      )}
    >
      {/* Top: Title only */}
      <div className="flex items-start justify-between gap-2">
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
            <PinIcon className={cn("h-4 w-4 transition-transform duration-200", note.isPinned ? "fill-white rotate-0" : "-rotate-45")} />
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
            <Star className={cn("h-4 w-4 transition-colors", note.isFavorite && "fill-yellow-500 text-yellow-500")} />
          </Button>
        </div>
      </div>

      {/* Content Preview */}
      <div className="flex-1 min-h-0">
        {note.content && (
          <div>
            <p 
              ref={contentRef}
              className={cn("text-xs leading-relaxed whitespace-pre-wrap overflow-hidden", mutedTextClass)}
              style={{ maxHeight: '154px' }} // 8 lines + 10px padding to show 8th line fully
            >
              {note.content}
            </p>
            {isOverflowing && (
              <p className={cn("text-xs mt-0.5", mutedTextClass)}>...</p>
            )}
          </div>
        )}
        
        {/* Image Preview Thumbnail */}
        {note.images && note.images.length > 0 && (
          <div className="mt-2">
            <img 
              src={note.images[0]} 
              alt="Note attachment" 
              className="h-16 w-full object-cover rounded-md"
            />
            {note.images.length > 1 && (
              <span className={cn("text-[10px] mt-1 block", mutedTextClass)}>+{note.images.length - 1} more</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom section: Updated, Folder, Images on left; Tags on right */}
      <div 
        className={cn(
          "flex items-center justify-between gap-2 pt-2 border-t",
          !hasCustomColor && (useWhiteText ? "border-white/30" : "border-border")
        )}
        style={{ borderColor: hasCustomColor ? note.color : undefined }}
      >
        <div className="flex items-center gap-2 text-[10px] min-w-0">
          <span>Updated {formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
          {note.folder && (
            <>
              <span className={useWhiteText ? "text-white/30" : "text-muted-foreground/50"}>•</span>
              <span className={cn("flex items-center gap-1", mutedTextClass)}>
                <Folder className="h-3 w-3" />
                {note.folder}
              </span>
            </>
          )}
          {note.images && note.images.length > 0 && (
            <>
              <span className={useWhiteText ? "text-white/30" : "text-muted-foreground/50"}>•</span>
              <span className={cn("flex items-center gap-1", mutedTextClass)}>
                <Image className="h-3 w-3" />
                {note.images.length}
              </span>
            </>
          )}
        </div>
        {note.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {note.tags.slice(0, 2).map((tag) => (
              <span key={tag} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]", useWhiteText ? "bg-white/20 text-white/80" : "bg-secondary text-muted-foreground")}>
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className={cn("text-[10px]", mutedTextClass)}>+{note.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
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

  // Lightbox state for viewing images
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
              <PinIcon className={cn("h-4 w-4 transition-transform duration-200", note.isPinned ? "fill-foreground rotate-0" : "-rotate-45")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-yellow-500 hover:bg-yellow-500/10"
              onClick={onToggleFavorite}
            >
              <Star className={cn("h-4 w-4 transition-colors", note.isFavorite && "fill-yellow-500 text-yellow-500")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              onClick={onEdit}
              aria-label="Edit note"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-red-500 hover:bg-red-500/10"
              onClick={onDelete}
              aria-label="Delete note"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogHeader>

      <div className="max-h-[60vh] pr-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-2">
          {/* Images */}
          {note.images && note.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {note.images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Note image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setLightboxImage(img)}
                  style={{ borderColor: useWhiteText ? 'rgba(255,255,255,0.2)' : undefined }}
                />
              ))}
            </div>
          )}

          <div className="prose prose-invert max-w-none">
            <p className={cn("text-sm whitespace-pre-wrap leading-relaxed", useWhiteText ? "text-white/90" : "text-foreground/80")}>
              {note.content}
            </p>
          </div>

          {/* Bottom section: Created, Updated, Folder, Images on left; Tags on right */}
          <div className={cn("flex items-center justify-between gap-2 text-xs pt-3", useWhiteText ? "text-white/80 border-t-2 border-white/40" : "text-muted-foreground border-t border-border")}>
            <div className="flex items-center gap-2 min-w-0">
              <span>Created {format(note.createdAt, 'MMM d, yyyy')}</span>
              <span>•</span>
              <span>Updated {formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
              {note.folder && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {note.folder}
                  </span>
                </>
              )}
              {note.images && note.images.length > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    {note.images.length}
                  </span>
                </>
              )}
            </div>
            {note.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {note.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded text-[10px]",
                      useWhiteText ? "bg-white/20 text-white/80" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
                {note.tags.length > 2 && (
                  <span className={cn("text-[10px]", useWhiteText ? "text-white/70" : "text-muted-foreground")}>+{note.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-[95vw] max-h-[95vh] object-contain"
          />
        </div>
      )}
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

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className={cn(
              "text-lg font-medium focus:ring-0 transition-colors",
              useWhiteText
                ? "bg-white/10 border-white/20 text-white placeholder:text-white/50"
                : "bg-background border-border text-foreground placeholder:text-muted-foreground"
            )}
            style={{
              ['--tw-ring-color' as string]: color
            }}
            onFocus={(e) => {
              if (color && color !== 'hsl(var(--card))') {
                e.target.style.borderColor = color;
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '';
            }}
          />
        </div>

        <div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note..."
            rows={8}
            className={cn(
              "focus:ring-0 resize-none transition-colors custom-scrollbar",
              useWhiteText
                ? "bg-white/10 border-white/20 text-white placeholder:text-white/50"
                : "bg-background border-border text-foreground placeholder:text-muted-foreground"
            )}
            style={useWhiteText ? {
              scrollbarColor: 'rgba(255,255,255,0.2) transparent'
            } : undefined}
            onFocus={(e) => {
              if (color && color !== 'hsl(var(--card))') {
                e.target.style.borderColor = color;
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '';
            }}
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
                : "border border-border text-foreground/70 hover:text-foreground hover:bg-secondary"
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
              "focus:ring-0",
              useWhiteText
                ? "bg-white/10 border-white/20 text-white placeholder:text-white/50"
                : "bg-background border-border text-foreground placeholder:text-muted-foreground"
            )}
            onFocus={(e) => {
              if (color && color !== 'hsl(var(--card))') {
                e.target.style.borderColor = color;
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '';
            }}
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
                "flex-1 focus:ring-0",
                useWhiteText
                  ? "bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  : "bg-background border-border text-foreground placeholder:text-muted-foreground"
              )}
              onFocus={(e) => {
                if (color && color !== 'hsl(var(--card))') {
                  e.target.style.borderColor = color;
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '';
              }}
            />
            <button 
              type="button" 
              onClick={addTag} 
              className={cn(
                "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 w-10",
                useWhiteText 
                  ? "border border-white/30 text-white/80 hover:text-white hover:bg-white/20" 
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
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
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim()} className="bg-white/75 border border-white text-neutral-950 hover:bg-white hover:border-white">
            Save Changes
          </Button>
        </div>
      </form>
    </>
  );
}


