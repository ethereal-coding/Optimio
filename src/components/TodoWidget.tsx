import { useState } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddTodoForm } from './AddTodoForm';
import { addTodoWithSync, updateTodoWithSync, toggleTodoWithSync, deleteTodoWithSync } from '@/lib/todo-sync';

export function TodoWidget() {
  const { state, dispatch } = useAppState();
  const { todos } = state;
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<typeof todos[0] | null>(null);
  const [editingTodo, setEditingTodo] = useState<typeof todos[0] | null>(null);

  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  }).slice(0, 8);

  const handleToggleTodo = async (todoId: string) => {
    await toggleTodoWithSync(todoId, dispatch, actions);
  };

  const handleDeleteTodo = async (todoId: string) => {
    await deleteTodoWithSync(todoId, dispatch, actions);
  };

  const handleAddTodo = async (todo: any) => {
    await addTodoWithSync(todo, dispatch, actions);
    setShowAddTodo(false);
  };

  const handleUpdateTodo = async (todo: any) => {
    await updateTodoWithSync(todo, dispatch, actions);
    setEditingTodo(null);
  };

  const pendingCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  return (
    <Card className="bg-card border-border rounded-lg h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-foreground">Tasks</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={showAddTodo} onOpenChange={setShowAddTodo}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary"
              onClick={() => setShowAddTodo(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add New Task</DialogTitle>
              </DialogHeader>
              <AddTodoForm onSubmit={handleAddTodo} onCancel={() => setShowAddTodo(false)} />
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-secondary h-7 gap-1"
            onClick={() => dispatch(actions.setView('todos'))}
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-0.5 mt-2 p-1 bg-secondary/30 rounded-md">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <Button
              key={f}
              variant="ghost"
              size="sm"
              className={cn(
                'text-xs capitalize flex-1 rounded-md h-7 transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
              onClick={() => setFilter(f)}
            >
              {f}
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {f === 'all' ? todos.length : f === 'pending' ? pendingCount : completedCount}
              </span>
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[260px] pr-3">
          <div className="pb-2">
          {filteredTodos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No {filter} tasks</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="group flex items-center gap-3 p-2.5 rounded-md bg-secondary/40 border border-border/60 hover:border-border hover:bg-secondary/60 transition-all cursor-pointer"
                  onClick={() => setSelectedTodo(todo)}
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => handleToggleTodo(todo.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="border-muted-foreground/40"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm truncate transition-all',
                      todo.completed && 'line-through text-muted-foreground'
                    )}>
                      {todo.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px]',
                        todo.priority === 'high' && 'bg-red-500/20 text-red-400',
                        todo.priority === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                        todo.priority === 'low' && 'bg-blue-500/20 text-blue-400'
                      )}>
                        {todo.priority}
                      </span>
                      {todo.dueDate && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(todo.dueDate, 'MMM d')}
                        </span>
                      )}
                      {todo.category && (
                        <span className="text-[10px] text-muted-foreground">
                          {todo.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* View Todo Dialog */}
      <Dialog open={!!selectedTodo && !editingTodo} onOpenChange={(open) => {
        if (!open) {
          setSelectedTodo(null);
          setEditingTodo(null);
        }
      }}>
        <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
          {selectedTodo && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pt-4">
                  <DialogTitle className="text-lg text-foreground flex-1">{selectedTodo.title}</DialogTitle>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={() => setEditingTodo(selectedTodo)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => {
                        handleDeleteTodo(selectedTodo.id);
                        setSelectedTodo(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="border-t border-border -mt-4"></div>

              <div className="space-y-4 pt-3">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedTodo.completed}
                    onCheckedChange={() => handleToggleTodo(selectedTodo.id)}
                    className="border-muted-foreground/40"
                  />
                  <span className="text-sm text-foreground/60">
                    {selectedTodo.completed ? 'Completed' : 'Not completed'}
                  </span>
                </div>

                {/* Priority & Due Date */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Priority:</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      selectedTodo.priority === 'high' && 'bg-red-500/20 text-red-400',
                      selectedTodo.priority === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                      selectedTodo.priority === 'low' && 'bg-blue-500/20 text-blue-400'
                    )}>
                      {selectedTodo.priority}
                    </span>
                  </div>
                  {selectedTodo.dueDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due:</span>
                      <span className={cn(
                        'text-foreground/60',
                        isPast(selectedTodo.dueDate) && !isToday(selectedTodo.dueDate) && !selectedTodo.completed && 'text-red-400'
                      )}>
                        {format(selectedTodo.dueDate, 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Category */}
                {selectedTodo.category && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Category: </span>
                    <span className="text-foreground/60">{selectedTodo.category}</span>
                  </div>
                )}

                {/* Description */}
                {selectedTodo.description && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Description</label>
                    <p className="text-sm text-foreground/70 leading-relaxed">{selectedTodo.description}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Todo Dialog */}
      <Dialog open={!!editingTodo} onOpenChange={(open) => {
        if (!open) {
          setEditingTodo(null);
        }
      }}>
        <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
          {editingTodo && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">Edit Task</DialogTitle>
              </DialogHeader>
              <AddTodoForm
                initialTodo={editingTodo}
                onSubmit={handleUpdateTodo}
                onCancel={() => setEditingTodo(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
