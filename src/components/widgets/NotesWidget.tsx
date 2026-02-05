import React, { useState } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  FileText,
  Plus,
  Star,
  ChevronRight,
  Clock,
  Folder,
  Tag,
  Edit2,
  Trash2,
  Image
} from 'lucide-react';
import { PinIcon } from '@/components/icons/PinIcon';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddNoteForm } from '@/components/forms/AddNoteForm';
import { addNoteWithSync, updateNoteWithSync, deleteNoteWithSync, toggleNotePinWithSync, toggleNoteFavoriteWithSync } from '@/lib/note-sync';
import type { Note } from '@/types';

interface NotesWidgetProps {
  className?: string;
}

export const NotesWidget = React.memo(function NotesWidget({ className }: NotesWidgetProps) {
  const { state, dispatch } = useAppState();
  const { notes } = state;

  const [showAddNote, setShowAddNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState<typeof notes[0] | null>(null);
  const [editingNote, setEditingNote] = useState<typeof notes[0] | null>(null);

  const pinnedNotes = notes.filter(n => n.isPinned);
  const recentNotes = notes.filter(n => !n.isPinned).slice(0, 5);

  const handleAddNote = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addNoteWithSync(note, dispatch, actions);
    setShowAddNote(false);
  };

  const handleTogglePin = async (noteOrId: string | Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const note = typeof noteOrId === 'string' ? notes.find(n => n.id === noteOrId) : noteOrId;
    if (note) {
      await toggleNotePinWithSync(note, dispatch, actions);
    }
  };

  const handleToggleFavorite = async (noteOrId: string | Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const note = typeof noteOrId === 'string' ? notes.find(n => n.id === noteOrId) : noteOrId;
    if (note) {
      await toggleNoteFavoriteWithSync(note, dispatch, actions);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNoteWithSync(noteId, dispatch, actions);
    setSelectedNote(null);
  };

  const handleUpdateNote = async (note: Note) => {
    await updateNoteWithSync(note, dispatch, actions);
    setEditingNote(null);
    setSelectedNote(note);
  };

  return (
    <Card className={cn("bg-card border-border rounded-lg w-full h-full flex flex-col", className)}>
      <CardHeader className="pb-3 flex-shrink-0" data-slot="widget-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-foreground">Notes</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => setShowAddNote(true)}
                aria-label="Add new note"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle className="text-foreground">Create New Note</DialogTitle>
                </DialogHeader>
                <AddNoteForm onSubmit={handleAddNote} onCancel={() => setShowAddNote(false)} />
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-secondary h-7 gap-1"
              onClick={() => dispatch(actions.setView('notes'))}
              aria-label="View all notes"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </CardHeader>

      <CardContent className="flex-1 overflow-hidden min-w-0" data-slot="widget-content">
        <ScrollArea className="h-full w-full pr-3" data-slot="widget-scroll">
          <div className="pb-2" data-slot="widget-inner">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No notes found</p>
            </div>
          ) : (
            <div className="space-y-3" data-slot="widget-items-container" role="list">
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <PinIcon className="h-3 w-3" aria-hidden="true" />
                    Pinned
                  </p>
                  <div className="space-y-2" role="list">
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onClick={() => setSelectedNote(note)}
                        onTogglePin={handleTogglePin}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Notes */}
              {recentNotes.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Recent
                  </p>
                  <div className="space-y-2" role="list">
                    {recentNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onClick={() => setSelectedNote(note)}
                        onTogglePin={handleTogglePin}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </ScrollArea>
      </CardContent>

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
    </Card>
  );
});

interface NoteCardProps {
  note: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    updatedAt: Date;
    isPinned?: boolean;
    isFavorite?: boolean;
    color?: string;
  };
  onClick: () => void;
  onTogglePin: (noteId: string, e: React.MouseEvent) => void;
  onToggleFavorite: (noteId: string, e: React.MouseEvent) => void;
}

function NoteCard({ note, onClick, onTogglePin, onToggleFavorite }: NoteCardProps) {
  // Color support
  const hasCustomColor = !!note.color;
  const isGraphite = note.color === 'hsl(var(--card))';
  const useWhiteText = hasCustomColor && !isGraphite;
  
  return (
    <div
      onClick={onClick}
      role="listitem"
      aria-label={`${note.title}${note.isPinned ? ', pinned' : ''}${note.isFavorite ? ', favorited' : ''}`}
      style={{
        backgroundColor: hasCustomColor ? `${note.color}CC` : undefined, // CC = 80% opacity
        borderColor: hasCustomColor ? note.color : undefined // 100% opacity
      }}
      className={cn(
        "p-3 rounded-md border transition-all cursor-pointer group flex flex-col gap-2",
        hasCustomColor 
          ? "border-2 hover:brightness-110" 
          : "bg-card border-border hover:border-border-strong hover:bg-secondary/30 transition-colors",
      )}
    >
      {/* Top row: Title with action buttons */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className={cn("text-sm font-medium truncate", useWhiteText ? "text-white" : "text-foreground")}>
            {note.title}
          </h4>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 transition-colors",
              useWhiteText 
                ? "text-white/80 hover:text-white hover:bg-white/20" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            onClick={(e) => onTogglePin(note.id, e)}
            aria-label={note.isPinned ? `Unpin note: ${note.title}` : `Pin note: ${note.title}`}
            aria-pressed={note.isPinned}
          >
            <PinIcon className={cn(
              "h-3 w-3 transition-transform duration-200",
              note.isPinned 
                ? useWhiteText ? "fill-white text-white rotate-0" : "fill-foreground text-foreground rotate-0"
                : "-rotate-45"
            )} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 transition-colors",
              useWhiteText 
                ? "text-white/80 hover:text-yellow-500 hover:bg-yellow-500/10" 
                : "text-foreground/20 hover:text-yellow-500 hover:bg-yellow-500/10"
            )}
            onClick={(e) => onToggleFavorite(note.id, e)}
            aria-label={note.isFavorite ? `Remove from favorites: ${note.title}` : `Add to favorites: ${note.title}`}
            aria-pressed={note.isFavorite}
          >
            <Star className={cn(
              "h-3 w-3",
              note.isFavorite && "fill-yellow-500 text-yellow-500"
            )} />
          </Button>
        </div>
      </div>

      {/* Content preview */}
      <p className={cn("text-xs line-clamp-2 leading-relaxed", useWhiteText ? "text-white/70" : "text-muted-foreground")}>
        {note.content}
      </p>
      
      {/* Bottom row: Updated time on left; Tags on right */}
      <div 
        className={cn(
          "flex items-center justify-between gap-2 text-[10px] pt-1 border-t mt-auto",
          useWhiteText ? "text-white/70 border-white/30" : "text-muted-foreground border-border/50"
        )}
        style={{ borderColor: hasCustomColor ? note.color : undefined }}
      >
        <span>{formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
        {note.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {note.tags.slice(0, 2).map((tag) => (
              <span 
                key={tag} 
                className={cn(
                  "px-1.5 py-0.5 rounded",
                  useWhiteText ? "bg-white/20 text-white/80" : "bg-secondary text-foreground/50"
                )}
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className={useWhiteText ? "text-white/50" : "text-foreground/30"}>+{note.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// View Note Content Component
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    useWhiteText 
                      ? "text-white/80 hover:text-white hover:bg-white/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                  onClick={onTogglePin}
                >
                  <PinIcon className={cn(
                    "h-4 w-4 transition-transform duration-200", 
                    note.isPinned 
                      ? useWhiteText ? "fill-white text-white rotate-0" : "fill-foreground text-foreground rotate-0"
                      : "-rotate-45"
                  )} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                {note.isPinned ? 'Unpin note' : 'Pin note'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    useWhiteText 
                      ? "text-white/80 hover:text-yellow-500 hover:bg-yellow-500/10" 
                      : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                  )}
                  onClick={onToggleFavorite}
                >
                  <Star className={cn(
                    "h-4 w-4 transition-colors", 
                    note.isFavorite && "fill-yellow-500 text-yellow-500"
                  )} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                {note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    useWhiteText 
                      ? "text-white/80 hover:text-white hover:bg-white/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                  onClick={onEdit}
                  aria-label="Edit note"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                Edit note
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    useWhiteText 
                      ? "text-white/80 hover:text-red-500 hover:bg-red-500/10" 
                      : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  )}
                  onClick={onDelete}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                Delete note
              </TooltipContent>
            </Tooltip>
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
            <p className={cn(
              "text-sm whitespace-pre-wrap leading-relaxed", 
              useWhiteText ? "text-white/90" : "text-foreground/80"
            )}>
              {note.content}
            </p>
          </div>

          {/* Bottom section: Created, Updated, Folder, Images on left; Tags on right */}
          <div className={cn(
            "flex items-center justify-between gap-2 text-xs pt-3",
            useWhiteText ? "text-white/80 border-t-2 border-white/40" : "text-muted-foreground border-t border-border"
          )}>
            <div className="flex items-center gap-2 min-w-0">
              <span>Created {format(note.createdAt, 'MMM d, yyyy')}</span>
              <span>•</span>
              <span>Updated {formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
              {note.folder && (
                <>
                  <span>•</span>
                  <span className={cn(
                    "flex items-center gap-1",
                    useWhiteText ? "text-white/80" : "text-muted-foreground"
                  )}>
                    <Folder className="h-3 w-3" />
                    {note.folder}
                  </span>
                </>
              )}
              {note.images && note.images.length > 0 && (
                <>
                  <span>•</span>
                  <span className={cn(
                    "flex items-center gap-1",
                    useWhiteText ? "text-white/80" : "text-muted-foreground"
                  )}>
                    <Image className="h-3 w-3" />
                    {note.images.length}
                  </span>
                </>
              )}
            </div>
            {note.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {note.tags.slice(0, 3).map((tag) => (
                  <span 
                    key={tag} 
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                      useWhiteText ? "bg-white/20 text-white/80" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span className={useWhiteText ? "text-white/60" : "text-muted-foreground"}>
                    +{note.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox for viewing images */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}

// Edit Note Content Component
interface EditNoteContentProps {
  note: Note;
  onSave: (note: Note) => void;
  onCancel: () => void;
}

function EditNoteContent({ note, onSave, onCancel }: EditNoteContentProps) {
  // Check if note has a custom color (not graphite)
  const hasColor = !!note.color;
  const isGraphite = note.color === 'hsl(var(--card))';
  const useWhiteText = hasColor && !isGraphite;

  return (
    <>
      <DialogHeader>
        <DialogTitle className={cn(useWhiteText ? "text-white" : "text-foreground")}>
          Edit Note
        </DialogTitle>
      </DialogHeader>
      <AddNoteForm
        initialNote={note}
        onSubmit={onSave}
        onCancel={onCancel}
      />
    </>
  );
}
