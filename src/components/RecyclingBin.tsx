import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, RotateCcw, Calendar, CheckSquare, Target, FileText } from 'lucide-react';
import { db } from '@/lib/db';
import type { DeletedEvent, DeletedTodo, DeletedGoal, DeletedNote } from '@/lib/db';
import { format } from 'date-fns';


interface RecyclingBinProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'events' | 'todos' | 'goals' | 'notes' | 'all';
}

export function RecyclingBin({ open, onOpenChange, type }: RecyclingBinProps) {
  const [deletedItems, setDeletedItems] = useState<Array<{
    id: string;
    title: string;
    type: 'event' | 'todo' | 'goal' | 'note';
    deletedAt: string;
    data: unknown;
  }>>([]);

  const loadDeletedItems = async () => {
    const items: Array<{
      id: string;
      title: string;
      type: 'event' | 'todo' | 'goal' | 'note';
      deletedAt: string;
      data: unknown;
    }> = [];

    if (type === 'all' || type === 'events') {
      const events = await db.deletedEvents.toArray();
      items.push(...events.map(e => ({
        id: e.id,
        title: e.title,
        type: 'event' as const,
        deletedAt: e.deletedAt,
        data: e
      })));
    }

    if (type === 'all' || type === 'todos') {
      const todos = await db.deletedTodos.toArray();
      items.push(...todos.map(t => ({
        id: t.id,
        title: t.title,
        type: 'todo' as const,
        deletedAt: t.deletedAt,
        data: t
      })));
    }

    if (type === 'all' || type === 'goals') {
      const goals = await db.deletedGoals.toArray();
      items.push(...goals.map(g => ({
        id: g.id,
        title: g.title,
        type: 'goal' as const,
        deletedAt: g.deletedAt,
        data: g
      })));
    }

    if (type === 'all' || type === 'notes') {
      const notes = await db.deletedNotes.toArray();
      items.push(...notes.map(n => ({
        id: n.id,
        title: n.title,
        type: 'note' as const,
        deletedAt: n.deletedAt,
        data: n
      })));
    }

    // Sort by deletedAt descending (most recent first)
    items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    setDeletedItems(items);
  };

  useEffect(() => {
    if (open) {
      loadDeletedItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type]);

  const handleRestore = async (item: typeof deletedItems[0]) => {
    switch (item.type) {
      case 'event': {
        const eventData = item.data as DeletedEvent;
        await db.events.add({ ...eventData, id: eventData.originalId });
        await db.deletedEvents.delete(item.id);
        break;
      }
      case 'todo': {
        const todoData = item.data as DeletedTodo;
        await db.todos.add({ ...todoData, id: todoData.originalId });
        await db.deletedTodos.delete(item.id);
        break;
      }
      case 'goal': {
        const goalData = item.data as DeletedGoal;
        await db.goals.add({ ...goalData, id: goalData.originalId });
        await db.deletedGoals.delete(item.id);
        break;
      }
      case 'note': {
        const noteData = item.data as DeletedNote;
        await db.notes.add({ ...noteData, id: noteData.originalId });
        await db.deletedNotes.delete(item.id);
        break;
      }
    }
    await loadDeletedItems();
  };

  const handlePermanentDelete = async (item: typeof deletedItems[0]) => {
    switch (item.type) {
      case 'event':
        await db.deletedEvents.delete(item.id);
        break;
      case 'todo':
        await db.deletedTodos.delete(item.id);
        break;
      case 'goal':
        await db.deletedGoals.delete(item.id);
        break;
      case 'note':
        await db.deletedNotes.delete(item.id);
        break;
    }
    await loadDeletedItems();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'todo': return <CheckSquare className="h-4 w-4" />;
      case 'goal': return <Target className="h-4 w-4" />;
      case 'note': return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-lg max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Recycling Bin
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh]">
          {deletedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No deleted items</p>
              <p className="text-sm mt-1">Items you delete will appear here for 30 days</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deletedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                      {getIcon(item.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • Deleted {format(new Date(item.deletedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRestore(item)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handlePermanentDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
