import React, { useState } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import type { Todo } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  ChevronRight,
  Circle,
  PlayCircle,
  CheckCircle2,
  Tag,
  Target,
  Link2,
  GripVertical
} from 'lucide-react';
import { TaskGoalLinker } from '@/components/TaskGoalLinker';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddTodoForm } from '@/components/forms/AddTodoForm';
import { addTodoWithSync, updateTodoWithSync, toggleTodoWithSync, deleteTodoWithSync, reorderTodosWithSync } from '@/lib/todo-sync';
import { removeTaskFromGoalWithSync } from '@/lib/goal-sync';
import type { Goal } from '@/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TodoWidgetProps {
  className?: string;
}

export const TodoWidget = React.memo(function TodoWidget({ className }: TodoWidgetProps) {
  const { state, dispatch } = useAppState();
  const { todos, goals } = state;
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<typeof todos[0] | null>(null);
  const [editingTodo, setEditingTodo] = useState<typeof todos[0] | null>(null);
  const [linkerOpen, setLinkerOpen] = useState(false);

  const priorityValue = { high: 3, medium: 2, low: 1 };
  
  const filteredTodos = todos
    .filter(todo => !todo.completed)
    .sort((a, b) => (priorityValue[b.priority] || 0) - (priorityValue[a.priority] || 0))
    .slice(0, 8);

  const handleToggleTodo = async (todoId: string) => {
    await toggleTodoWithSync(todoId, dispatch, actions);
  };

  const handleDeleteTodo = async (todoId: string) => {
    await deleteTodoWithSync(todoId, dispatch, actions);
  };

  const handleAddTodo = async (todo: Omit<Todo, 'id' | 'createdAt'>) => {
    await addTodoWithSync(todo, dispatch, actions);
    setShowAddTodo(false);
  };

  const handleUpdateTodo = async (todo: Todo) => {
    await updateTodoWithSync(todo, dispatch, actions);
    setEditingTodo(null);
  };

  const pendingCount = todos.filter(t => !t.completed).length;

  return (
    <Card className={cn("bg-card border-border rounded-lg w-full h-full flex flex-col", className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <CheckSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-sm font-medium text-foreground">Tasks</CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Dialog open={showAddTodo} onOpenChange={setShowAddTodo}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    onClick={() => setShowAddTodo(true)}
                    aria-label="Add new task"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                  Add new task
                </TooltipContent>
              </Tooltip>
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
              aria-label="View all tasks"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs - using flex-1 with min-w-0 */}
        <div className="flex items-center gap-1 mt-2 bg-card border border-border rounded-lg p-1 min-w-0">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <Button
              key={f}
              variant="ghost"
              size="sm"
              className={cn(
                'text-xs capitalize flex-1 min-w-0 h-8 transition-colors rounded-sm',
                filter === f
                  ? 'bg-white/75 border border-white text-neutral-950 hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
              onClick={() => setFilter(f)}
            >
              <span className="truncate">{f}</span>
              <span className={cn(
                'ml-1.5 text-[10px] flex-shrink-0',
                filter === f ? 'text-black/60' : 'text-muted-foreground'
              )}>
                {f === 'all' || f === 'pending' ? pendingCount : 0}
              </span>
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden min-w-0">
        <ScrollArea className="h-full w-full pr-3">
          <div className="pb-2 min-w-0">
          {filteredTodos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No {filter} tasks</p>
            </div>
          ) : (
            <div className="space-y-2 min-w-0" role="list">
              {filteredTodos.map((todo) => {
                const isOverdue = todo.dueDate && isPast(todo.dueDate) && !isToday(todo.dueDate) && !todo.completed;
                return (
                  <div
                    key={todo.id}
                    className="p-3 rounded-md bg-card border border-border hover:border-border-strong hover:bg-secondary/30 transition-colors cursor-pointer group flex flex-col gap-2 min-w-0 overflow-hidden"
                    onClick={() => setSelectedTodo(todo)}
                    role="listitem"
                    aria-label={`${todo.completed ? 'Completed' : 'Pending'} task: ${todo.title}${todo.priority ? `, ${todo.priority} priority` : ''}`}
                  >
                    {/* Top row: Checkbox + Priority dot + Title + Goal Icon */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() => handleToggleTodo(todo.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="border-muted-foreground/40 flex-shrink-0"
                        aria-label={`Mark ${todo.title} as ${todo.completed ? 'incomplete' : 'complete'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className={cn(
                              'h-2 w-2 rounded-full flex-shrink-0 border',
                              todo.priority === 'high' && 'bg-red-500/50 text-red-400 border border-red-500',
                              todo.priority === 'medium' && 'bg-yellow-500/50 text-yellow-500 border border-yellow-500',
                              todo.priority === 'low' && 'bg-blue-500/50 text-blue-400 border border-blue-500'
                            )}
                            aria-label={`${todo.priority} priority`}
                            role="img"
                          />
                          <p className={cn(
                            'text-sm text-foreground truncate',
                            todo.completed && 'line-through text-muted-foreground'
                          )}>
                            {todo.title}
                          </p>
                        </div>
                      </div>
                      {/* Goal icon - unlink when clicked */}
                      {(() => {
                        const linkedGoal = goals.find((g: Goal) => g.taskIds?.includes(todo.id));
                        if (linkedGoal) {
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTaskFromGoalWithSync(linkedGoal.id, todo.id, dispatch, actions);
                              }}
                              className="flex-shrink-0 text-white hover:text-muted-foreground transition-colors"
                              title={`Linked to: ${linkedGoal.title} (click to unlink)`}
                            >
                              <Target className="h-4 w-4" />
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Bottom row: Due date LEFT; Priority, Category RIGHT */}
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      <div className="flex items-center gap-1 min-w-0">
                        {todo.dueDate && (
                          <span className={cn(
                            'flex items-center gap-1',
                            isOverdue && 'text-red-400'
                          )}>
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {isToday(todo.dueDate) ? 'Today' : isTomorrow(todo.dueDate) ? 'Tomorrow' : isOverdue ? 'Overdue' : format(todo.dueDate, 'MMM d')}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Goal badge */}
                        {(() => {
                          const linkedGoal = goals.find((g: Goal) => g.taskIds?.includes(todo.id));
                          if (linkedGoal) {
                            return (
                              <span
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-secondary text-foreground/50"
                                title={linkedGoal.title}
                              >
                                <Target className="h-3 w-3" />
                                <span className="truncate max-w-[60px]">{linkedGoal.title.slice(0, 8)}</span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <span className={cn(
                          'flex items-center px-1.5 py-0.5 rounded text-[10px] capitalize border transition-colors',
                          todo.priority === 'high' && 'bg-red-500/50 text-red-400 border-red-500',
                          todo.priority === 'medium' && 'bg-yellow-500/50 text-yellow-500 border-yellow-500',
                          todo.priority === 'low' && 'bg-blue-500/50 text-blue-400 border-blue-500'
                        )}>
                          {todo.priority}
                        </span>
                        {todo.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] border bg-secondary text-foreground/70 border-border">
                            {todo.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
        <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
          {selectedTodo && (
            <ViewTodoContent
              todo={selectedTodo}
              onEdit={() => setEditingTodo(selectedTodo)}
              onDelete={() => {
                handleDeleteTodo(selectedTodo.id);
                setSelectedTodo(null);
              }}
              onToggle={() => handleToggleTodo(selectedTodo.id)}
              onLinkGoal={() => setLinkerOpen(true)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Todo Dialog */}
      <Dialog open={!!editingTodo} onOpenChange={(open) => {
        if (!open) {
          setEditingTodo(null);
        }
      }}>
        <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
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

      {/* Task Goal Linker Dialog */}
      {selectedTodo && (
        <TaskGoalLinker
          todoId={selectedTodo.id}
          open={linkerOpen}
          onOpenChange={(open) => {
            setLinkerOpen(open);
            if (!open && !selectedTodo) {
              setSelectedTodo(null);
            }
          }}
        />
      )}
    </Card>
  );
});

// View Todo Content Component
interface ViewTodoContentProps {
  todo: Todo;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onLinkGoal: () => void;
}

function ViewTodoContent({ todo, onEdit, onDelete, onToggle, onLinkGoal }: ViewTodoContentProps) {
  const { state, dispatch } = useAppState();
  const { goals } = state;
  const isOverdue = todo.dueDate && isPast(todo.dueDate) && !isToday(todo.dueDate) && !todo.completed;
  const linkedGoal = goals.find((g: Goal) => g.taskIds?.includes(todo.id));

  const handleGoalClick = async () => {
    if (linkedGoal) {
      // Unlink the task from the goal
      await removeTaskFromGoalWithSync(linkedGoal.id, todo.id, dispatch, actions);
    } else {
      // Open the linker dialog
      onLinkGoal();
    }
  };

  // Determine status
  const getStatus = () => {
    if (todo.completed) return { label: 'Completed', icon: CheckCircle2, color: 'text-green-400' };
    if (isOverdue) return { label: 'In Progress', icon: PlayCircle, color: 'text-blue-400' };
    return { label: 'Not Started', icon: Circle, color: 'text-muted-foreground' };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between gap-4 pt-4">
          <div className="flex-1 flex items-start gap-3 min-w-0">
            <Checkbox
              checked={todo.completed}
              onClick={onToggle}
              className="mt-1 border-muted-foreground/40 flex-shrink-0"
              aria-label={`Mark ${todo.title} as ${todo.completed ? 'incomplete' : 'complete'}`}
            />
            <DialogTitle className={cn(
              "text-lg text-foreground break-words",
              todo.completed && "line-through text-muted-foreground"
            )}>
              {todo.title}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 hover:bg-secondary",
                    linkedGoal ? "text-white hover:text-muted-foreground" : "text-muted-foreground"
                  )}
                  onClick={handleGoalClick}
                  aria-label={linkedGoal ? "Unlink from goal" : "Link task to goal"}
                >
                  <Target className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                {linkedGoal ? `Linked to: ${linkedGoal.title}` : "Link to goal"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  onClick={onEdit}
                  aria-label="Edit task"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                Edit task
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  onClick={onDelete}
                  aria-label="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                Delete task
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </DialogHeader>

      <div className="max-h-[50vh] pr-2 overflow-y-auto custom-scrollbar">
        <div className="space-y-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={cn("flex items-center gap-1.5 text-xs", status.color)}>
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </span>
          </div>

          {/* Description */}
          {todo.description && (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{todo.description}</p>
            </div>
          )}

          {/* Bottom section: Dates on left; Category, Priority and Goal on right */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs pt-3 text-muted-foreground border-t border-border">
            {/* Left side: Dates */}
            <div className="flex flex-wrap items-center gap-2">
              <span>Created {format(todo.createdAt, 'MMM d, yyyy')}</span>
              {todo.dueDate && (
                <>
                  <span>•</span>
                  <span className={cn(isOverdue && "text-red-400")}>
                    Due {format(todo.dueDate, 'MMM d, yyyy')}
                  </span>
                </>
              )}
              {todo.completedAt && (
                <>
                  <span>•</span>
                  <span className="text-green-400">Completed {format(todo.completedAt, 'MMM d, yyyy')}</span>
                </>
              )}
            </div>

            {/* Right side: Priority, Goal and Category */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Priority tag */}
              <span
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] capitalize border backdrop-blur-sm",
                  todo.priority === 'high' && "bg-red-500/50 text-red-400 border-red-500",
                  todo.priority === 'medium' && "bg-yellow-500/50 text-yellow-500 border-yellow-500",
                  todo.priority === 'low' && "bg-blue-500/50 text-blue-400 border-blue-500"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {todo.priority}
              </span>

              {/* Goal tag */}
              {linkedGoal && (
                <span
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] bg-secondary text-foreground/50"
                  title={linkedGoal.title}
                >
                  <Target className="h-3 w-3" />
                  <span className="truncate max-w-[60px]">{linkedGoal.title.slice(0, 8)}</span>
                </span>
              )}

              {/* Category tag */}
              {todo.category && (
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-secondary text-foreground/50 text-[10px]">
                  <Tag className="h-3 w-3" />
                  {todo.category}
                </span>
              )}

              {/* Tags */}
              {todo.tags && todo.tags.length > 0 && (
                <>
                  {todo.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded bg-secondary text-foreground/50 text-[10px]">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                  {todo.tags.length > 2 && (
                    <span className="text-[10px]">+{todo.tags.length - 2}</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
