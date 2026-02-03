import { useState } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Plus,
  Star,
  Search,
  ChevronRight,
  Clock,
  Folder,
  Tag,
  Edit2,
  Trash2
} from 'lucide-react';
import { PinIcon } from '@/components/icons/PinIcon';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddNoteForm } from './AddNoteForm';
import { addNoteWithSync, updateNoteWithSync, deleteNoteWithSync, toggleNotePinWithSync, toggleNoteFavoriteWithSync } from '@/lib/note-sync';
import type { Note } from '@/types';

interface NotesWidgetProps {
  className?: string;
}

export function NotesWidget({ className }: NotesWidgetProps) {
  const { state, dispatch } = useAppState();
  const { notes } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState<typeof notes[0] | null>(null);
  const [editingNote, setEditingNote] = useState<typeof notes[0] | null>(null);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const recentNotes = filteredNotes.filter(n => !n.isPinned).slice(0, 5);

  const handleAddNote = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addNoteWithSync(note, dispatch, actions);
    setShowAddNote(false);
  };

  const handleTogglePin = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === noteId);
    if (note) {
      await toggleNotePinWithSync(note, dispatch, actions);
    }
  };

  const handleToggleFavorite = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === noteId);
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
      <CardHeader className="pb-3 flex-shrink-0">
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
              >
                <Plus className="h-4 w-4" />
              </Button>
              <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Add New Note</DialogTitle>
                </DialogHeader>
                <AddNoteForm onSubmit={handleAddNote} onCancel={() => setShowAddNote(false)} />
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-secondary h-7 gap-1"
              onClick={() => dispatch(actions.setView('notes'))}
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-md hover:border-border-strong focus:border-border-strong hover:bg-secondary/30 transition-colors"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden min-w-0">
        <ScrollArea className="h-full w-full pr-3">
          <div className="pb-2">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No notes found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <PinIcon className="h-3 w-3" />
                    Pinned
                  </p>
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
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

      {/* Note Detail Dialog */}
      <Dialog open={!!selectedNote && !editingNote} onOpenChange={(open) => {
        if (!open) {
          setSelectedNote(null);
          setEditingNote(null);
        }
      }}>
        <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
          {selectedNote && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pt-4">
                  <DialogTitle className="text-lg text-foreground flex-1">{selectedNote.title}</DialogTitle>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={(e) => handleTogglePin(selectedNote.id, e)}
                    >
                      <PinIcon className={cn(
                        "h-4 w-4",
                        selectedNote.isPinned && "fill-foreground text-foreground"
                      )} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={(e) => handleToggleFavorite(selectedNote.id, e)}
                    >
                      <Star className={cn(
                        "h-4 w-4",
                        selectedNote.isFavorite && "fill-yellow-500 text-yellow-500"
                      )} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={() => setEditingNote(selectedNote)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => handleDeleteNote(selectedNote.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {formatDistanceToNow(selectedNote.updatedAt, { addSuffix: true })}
                  </span>
                  {selectedNote.folder && (
                    <span className="flex items-center gap-1">
                      <Folder className="h-3 w-3" />
                      {selectedNote.folder}
                    </span>
                  )}
                </div>
                
                {selectedNote.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {selectedNote.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-secondary text-xs text-foreground/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="prose prose-invert max-w-none">
                  <p className="text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">{selectedNote.content}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNote} onOpenChange={(open) => {
        if (!open) {
          setEditingNote(null);
        }
      }}>
        <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
          {editingNote && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">Edit Note</DialogTitle>
              </DialogHeader>
              <AddNoteForm
                initialNote={editingNote}
                onSubmit={handleUpdateNote}
                onCancel={() => setEditingNote(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

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
      style={{
        backgroundColor: hasCustomColor ? `${note.color}CC` : undefined, // CC = 80% opacity
        borderColor: hasCustomColor ? note.color : undefined // 100% opacity
      }}
      className={cn(
        "p-3 rounded-md border transition-all cursor-pointer group flex flex-col gap-2",
        hasCustomColor 
          ? "border-2 hover:brightness-110" 
          : "bg-card border-border hover:border-border-strong hover:bg-secondary/30",
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
