import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Archive, RotateCcw, CheckSquare, Target, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import type { ArchivedTodo, ArchivedGoal } from '@/lib/db';
import { restoreArchivedTodo, restoreArchivedGoal } from '@/lib/archive';
import { format } from 'date-fns';

interface ArchiveProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'todos' | 'goals' | 'all';
}

export function Archive({ open, onOpenChange, type }: ArchiveProps) {
  const [archivedItems, setArchivedItems] = useState<Array<{
    id: string;
    title: string;
    type: 'todo' | 'goal';
    archivedAt: string;
    completedAt: string;
    data: ArchivedTodo | ArchivedGoal;
  }>>([]);

  const loadArchivedItems = async () => {
    const items: Array<{
      id: string;
      title: string;
      type: 'todo' | 'goal';
      archivedAt: string;
      completedAt: string;
      data: ArchivedTodo | ArchivedGoal;
    }> = [];

    if (type === 'all' || type === 'todos') {
      const todos = await db.archivedTodos.toArray();
      items.push(...todos.map(t => ({
        id: t.id,
        title: t.title,
        type: 'todo' as const,
        archivedAt: t.archivedAt,
        completedAt: t.completedAt,
        data: t
      })));
    }

    if (type === 'all' || type === 'goals') {
      const goals = await db.archivedGoals.toArray();
      items.push(...goals.map(g => ({
        id: g.id,
        title: g.title,
        type: 'goal' as const,
        archivedAt: g.archivedAt,
        completedAt: g.completedAt,
        data: g
      })));
    }

    // Sort by archivedAt descending (most recent first)
    items.sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());
    setArchivedItems(items);
  };

  useEffect(() => {
    if (open) {
      loadArchivedItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type]);

  const handleRestore = async (item: typeof archivedItems[0]) => {
    try {
      if (item.type === 'todo') {
        await restoreArchivedTodo(item.id);
      } else {
        await restoreArchivedGoal(item.id);
      }
      await loadArchivedItems();
    } catch (error) {
      console.error('Failed to restore item:', error);
    }
  };

  const handleDelete = async (item: typeof archivedItems[0]) => {
    try {
      if (item.type === 'todo') {
        await db.archivedTodos.delete(item.id);
      } else {
        await db.archivedGoals.delete(item.id);
      }
      await loadArchivedItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'todo': return <CheckSquare className="h-4 w-4" />;
      case 'goal': return <Target className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-lg max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archive
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-sm text-muted-foreground -mt-2">
          Completed items are automatically archived after 3 days
        </p>

        <ScrollArea className="h-[50vh]">
          {archivedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No archived items</p>
              <p className="text-sm mt-1">Completed tasks and goals appear here after 3 days</p>
            </div>
          ) : (
            <div className="space-y-2">
              {archivedItems.map((item) => (
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
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • 
                        Completed {format(new Date(item.completedAt), 'MMM d, yyyy')} • 
                        Archived {format(new Date(item.archivedAt), 'MMM d, yyyy')}
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
                      onClick={() => handleDelete(item)}
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
