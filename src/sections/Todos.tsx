import { useState, useEffect } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import {
  Button,
  Input,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';

import {
  CheckSquare,
  Search,
  Plus,
  Calendar as CalendarIcon,
  Edit2,
  Trash2,
  Circle,
  PlayCircle,
  CheckCircle2,
  Target,
  Tag
} from 'lucide-react';
import { TaskGoalLinker } from '@/components/TaskGoalLinker';
import { FeatureUtilities } from '@/components/FeatureUtilities';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, isTomorrow, addDays, isSameDay } from 'date-fns';
import { AddTodoForm } from '@/components/forms/AddTodoForm';
import type { Todo, Goal } from '@/types';
import { addTodoWithSync, updateTodoWithSync, toggleTodoWithSync, deleteTodoWithSync, reorderTodosWithSync } from '@/lib/todo-sync';
import { removeTaskFromGoalWithSync } from '@/lib/goal-sync';
import type { DragEndEvent } from '@dnd-kit/core';

type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

export function Todos() {
  const { state, dispatch } = useAppState();
  const { todos, goals } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [linkerOpen, setLinkerOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Auto-open todo from search - use setTimeout to defer state update and avoid cascading render
  useEffect(() => {
    if (state.selectedItemToOpen?.type === 'todo') {
      const itemId = state.selectedItemToOpen.id;
      const todo = state.todos.find(t => t.id === itemId);
      if (todo) {
        // Defer state update to avoid cascading render
        const timer = setTimeout(() => {
          setSelectedTodo(todo);
          dispatch(actions.setSelectedItemToOpen(null));
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [state.selectedItemToOpen, state.todos, dispatch]);

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

  // Helper to determine todo status
  const getTodoStatus = (todo: Todo) => {
    if (todo.completed) return 'completed';
    if (todo.dueDate && isPast(todo.dueDate) && !isToday(todo.dueDate)) return 'in-progress';
    return 'not-started';
  };

  // Filter todos
  const filteredTodos = todos.filter(todo => {
    const matchesSearch =
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.category?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false;

    return true;
  });

  // Group todos by status and sort by order
  const notStartedTodos = filteredTodos
    .filter(t => getTodoStatus(t) === 'not-started')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const inProgressTodos = filteredTodos
    .filter(t => getTodoStatus(t) === 'in-progress')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const completedTodos = filteredTodos
    .filter(t => getTodoStatus(t) === 'completed')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const handleAddTodo = async (todo: Todo) => {
    await addTodoWithSync(todo, dispatch, actions);
    setShowAddTodo(false);
  };

  const handleUpdateTodo = async (todo: Todo) => {
    // Find the original todo to preserve status-determining fields
    const originalTodo = todos.find(t => t.id === todo.id);
    if (originalTodo) {
      // Preserve completed status
      todo.completed = originalTodo.completed;
      todo.completedAt = originalTodo.completedAt;
      
      // If dueDate wasn't explicitly changed to a different day, preserve the original timestamp
      // This ensures overdue status (based on specific time) is maintained
      if (todo.dueDate && originalTodo.dueDate) {
        const newDate = new Date(todo.dueDate);
        const origDate = new Date(originalTodo.dueDate);
        if (isSameDay(newDate, origDate)) {
          todo.dueDate = originalTodo.dueDate;
        }
      }
    }
    
    await updateTodoWithSync(todo, dispatch, actions);
    setEditingTodo(null);
    setSelectedTodo(todo);
  };

  const handleDeleteTodo = async (todoId: string) => {
    await deleteTodoWithSync(todoId, dispatch, actions);
    setSelectedTodo(null);
  };

  const handleToggleTodo = async (todoId: string) => {
    await toggleTodoWithSync(todoId, dispatch, actions);
    const updatedTodo = todos.find(t => t.id === todoId);
    if (updatedTodo && selectedTodo?.id === todoId) {
      setSelectedTodo({ ...updatedTodo, completed: !updatedTodo.completed });
    }
  };

  const handleUnlinkGoal = async (goalId: string, todoId: string) => {
    await removeTaskFromGoalWithSync(goalId, todoId, dispatch, actions);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Check if dropped over a column (column IDs are strings like 'not-started', 'in-progress', 'completed')
    const columnIds = ['not-started', 'in-progress', 'completed'];
    const isOverColumn = columnIds.includes(overId);
    
    // Find the todo being dragged
    const todo = todos.find(t => t.id === activeId);
    if (!todo) return;

    // Handle vertical reordering within the same column
    if (!isOverColumn && activeId !== overId) {
      // Dropped over another todo - check if they're in the same status group
      const activeTodo = todos.find(t => t.id === activeId);
      const overTodo = todos.find(t => t.id === overId);
      
      if (activeTodo && overTodo) {
        // Determine which column each todo belongs to
        const getTodoColumn = (t: Todo) => {
          if (t.completed) return 'completed';
          if (t.dueDate && isPast(t.dueDate) && !isToday(t.dueDate)) return 'in-progress';
          return 'not-started';
        };
        
        const activeColumn = getTodoColumn(activeTodo);
        const overColumn = getTodoColumn(overTodo);
        
        if (activeColumn === overColumn) {
          // Same column - reorder vertically
          const columnTodos = todos.filter(t => getTodoColumn(t) === activeColumn);
          const oldIndex = columnTodos.findIndex(t => t.id === activeId);
          const newIndex = columnTodos.findIndex(t => t.id === overId);
          
          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedColumnTodos = arrayMove(columnTodos, oldIndex, newIndex);
            
            // Update order for all todos in this column
            const updatedColumnTodos = reorderedColumnTodos.map((t, index) => ({
              ...t,
              order: index
            }));
            
            // Merge with all other todos
            const allUpdatedTodos = todos.map(t => {
              if (getTodoColumn(t) === activeColumn) {
                return updatedColumnTodos.find(ut => ut.id === t.id) || t;
              }
              return t;
            });
            
            await reorderTodosWithSync(allUpdatedTodos, dispatch, actions);
            return;
          }
        }
      }
    }

    const updatedTodo = { ...todo };

    if (isOverColumn) {
      // Dropped over a column - move to that status
      switch (overId) {
        case 'completed':
          updatedTodo.completed = true;
          break;
        case 'not-started':
          updatedTodo.completed = false;
          // Set due date to tomorrow if it's overdue or not set
          if (!todo.dueDate || isPast(todo.dueDate)) {
            updatedTodo.dueDate = addDays(new Date(), 1);
          }
          break;
        case 'in-progress':
          updatedTodo.completed = false;
          // Set due date to yesterday to mark as overdue/in-progress
          updatedTodo.dueDate = addDays(new Date(), -1);
          break;
      }
    }

    // Only update if something changed
    if (JSON.stringify(updatedTodo) !== JSON.stringify(todo)) {
      await updateTodoWithSync(updatedTodo, dispatch, actions);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/50 text-red-400 border border-red-500';
      case 'medium': return 'bg-yellow-500/50 text-yellow-500 border border-yellow-500';
      case 'low': return 'bg-blue-500/50 text-blue-400 border border-blue-500';
      default: return 'bg-gray-500/50 text-gray-400 border border-gray-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
            <p className="text-xs text-muted-foreground">{filteredTodos.length} {filteredTodos.length === 1 ? 'task' : 'tasks'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-md hover:border-border-strong focus:border-border-strong hover:bg-secondary/20 transition-colors shadow-none"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPriorityFilter('all')}
              className={cn(
                "h-8 text-xs transition-colors",
                priorityFilter === 'all'
                  ? 'bg-white/75 border border-white text-neutral-950 hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPriorityFilter('high')}
              className={cn(
                "h-8 text-xs transition-colors gap-1",
                priorityFilter === 'high'
                  ? 'bg-white/75 border border-white text-neutral-950 hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-red-500/50 border border-red-500" />
              High
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPriorityFilter('medium')}
              className={cn(
                "h-8 text-xs transition-colors gap-1",
                priorityFilter === 'medium'
                  ? 'bg-white/75 border border-white text-neutral-950 hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-yellow-500/50 border border-yellow-500" />
              Medium
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPriorityFilter('low')}
              className={cn(
                "h-8 text-xs transition-colors gap-1",
                priorityFilter === 'low'
                  ? 'bg-white/75 border border-white text-neutral-950 hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-blue-500/50 border border-blue-500" />
              Low
            </Button>
          </div>

          {/* New Task Button */}
          <Button
            onClick={() => setShowAddTodo(true)}
            className="bg-white/75 border border-white text-black hover:bg-white hover:border-white h-10 px-4 ml-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>

          {/* Utilities Dropdown */}
          <FeatureUtilities type="todos" />
        </div>
      </div>

      {/* Tasks Board */}
      <div className="flex-1 p-0 overflow-x-auto overflow-y-hidden custom-scrollbar">
        {filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <CheckSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No tasks found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Start by creating your first task'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowAddTodo(true)}
                className="bg-white text-black hover:bg-white/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => {
              setIsDragging(true);
              setActiveId(e.active.id as string);
            }}
            onDragEnd={(e) => {
              setIsDragging(false);
              setActiveId(null);
              handleDragEnd(e);
            }}
            autoScroll={false}
          >
            <div className="flex h-full min-h-0 min-w-[900px] divide-x divide-border">
              {/* Not Started Column */}
              <DroppableColumn 
                id="not-started" 
                title="Not Started" 
                icon={<Circle className="h-4 w-4" />}
                count={notStartedTodos.length}
              >
                <SortableContext 
                  items={notStartedTodos.map(t => t.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {notStartedTodos.map((todo) => (
                      <SortableTodoCard
                        key={todo.id}
                        todo={todo}
                        goals={goals}
                        onClick={() => setSelectedTodo(todo)}
                        onToggle={() => handleToggleTodo(todo.id)}
                        onUnlinkGoal={handleUnlinkGoal}
                        getPriorityColor={getPriorityColor}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DroppableColumn>

              {/* In Progress Column */}
              <DroppableColumn 
                id="in-progress" 
                title="In Progress" 
                icon={<PlayCircle className="h-4 w-4 text-blue-400" />}
                count={inProgressTodos.length}
              >
                <SortableContext 
                  items={inProgressTodos.map(t => t.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {inProgressTodos.map((todo) => (
                      <SortableTodoCard
                        key={todo.id}
                        todo={todo}
                        goals={goals}
                        onClick={() => setSelectedTodo(todo)}
                        onToggle={() => handleToggleTodo(todo.id)}
                        onUnlinkGoal={handleUnlinkGoal}
                        getPriorityColor={getPriorityColor}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DroppableColumn>

              {/* Completed Column */}
              <DroppableColumn 
                id="completed" 
                title="Completed" 
                icon={<CheckCircle2 className="h-4 w-4 text-green-400" />}
                count={completedTodos.length}
              >
                <SortableContext 
                  items={completedTodos.map(t => t.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {completedTodos.map((todo) => (
                      <SortableTodoCard
                        key={todo.id}
                        todo={todo}
                        goals={goals}
                        onClick={() => setSelectedTodo(todo)}
                        onToggle={() => handleToggleTodo(todo.id)}
                        onUnlinkGoal={handleUnlinkGoal}
                        getPriorityColor={getPriorityColor}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DroppableColumn>
            </div>
            <DragOverlay dropAnimation={null}>
              {activeId ? (
                <TodoCard
                  todo={todos.find(t => t.id === activeId)!}
                  goals={goals}
                  onClick={() => {}}
                  onToggle={() => {}}
                  getPriorityColor={getPriorityColor}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add Todo Dialog */}
      <Dialog open={showAddTodo} onOpenChange={setShowAddTodo}>
        <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Task</DialogTitle>
          </DialogHeader>
          <AddTodoForm onSubmit={handleAddTodo} onCancel={() => setShowAddTodo(false)} />
        </DialogContent>
      </Dialog>

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
              goals={goals}
              onEdit={() => setEditingTodo(selectedTodo)}
              onDelete={() => handleDeleteTodo(selectedTodo.id)}
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
    </div>
  );
}

// Droppable Column Component
interface DroppableColumnProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}

function DroppableColumn({ id, title, icon, count, children }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 flex flex-col min-w-[280px] bg-background",
        isOver && "bg-accent/30"
      )}
    >
      <div className="text-center text-sm font-medium text-muted-foreground py-3 border-b border-border flex items-center justify-center gap-2">
        {icon}
        <span>{title}</span>
        <span className="text-xs bg-secondary px-2 py-0.5 rounded-md">
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {children}
      </div>
    </div>
  );
}

// Sortable Todo Card Component
interface SortableTodoCardProps {
  todo: Todo;
  goals: Goal[];
  onClick: () => void;
  onToggle: (e: React.MouseEvent) => void;
  onUnlinkGoal?: (goalId: string, todoId: string) => void;
  getPriorityColor: (priority: string) => string;
}

function SortableTodoCard({ todo, goals, onClick, onToggle, onUnlinkGoal, getPriorityColor }: SortableTodoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <TodoCard
        todo={todo}
        goals={goals}
        onClick={onClick}
        onToggle={onToggle}
        onUnlinkGoal={onUnlinkGoal}
        getPriorityColor={getPriorityColor}
      />
    </div>
  );
}

// Todo Card Component
interface TodoCardProps {
  todo: Todo;
  goals: Goal[];
  onClick: () => void;
  onToggle: (e: React.MouseEvent) => void;
  onUnlinkGoal?: (goalId: string, todoId: string) => void;
  getPriorityColor: (priority: string) => string;
}

function TodoCard({ todo, goals, onClick, onToggle, onUnlinkGoal, getPriorityColor }: TodoCardProps) {
  const isOverdue = todo.dueDate && isPast(todo.dueDate) && !isToday(todo.dueDate) && !todo.completed;
  const linkedGoal = goals.find(g => g.taskIds?.includes(todo.id));

  const getDueDateText = () => {
    if (!todo.dueDate) return null;
    if (isToday(todo.dueDate)) return 'Today';
    if (isTomorrow(todo.dueDate)) return 'Tomorrow';
    if (isOverdue) return 'Overdue';
    return format(todo.dueDate, 'MMM d');
  };

  return (
    <Card
      onClick={onClick}
      className="p-4 bg-card border border-border hover:border-border-strong hover:bg-secondary/30 transition-all cursor-pointer group h-[100px] flex flex-col gap-1"
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={todo.completed}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(e);
          }}
          className="border-muted-foreground/40"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full flex-shrink-0', getPriorityColor(todo.priority))} />
            <h3 className={cn(
              "text-sm text-foreground truncate",
              todo.completed && "line-through text-muted-foreground"
            )}>
              {todo.title}
            </h3>
          </div>
        </div>
        {/* Goal icon - unlink when clicked */}
        {linkedGoal && onUnlinkGoal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnlinkGoal(linkedGoal.id, todo.id);
            }}
            className="flex-shrink-0 text-white hover:text-muted-foreground transition-colors"
            title={`Linked to: ${linkedGoal.title} (click to unlink)`}
          >
            <Target className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Bottom section: Due date on left; Priority, Goal, Category, Tags on right */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border mt-auto">
        <div className="flex items-center gap-2 min-w-0">
          {todo.dueDate && (
            <span className={cn(
              "flex items-center gap-1",
              isOverdue && "text-red-400"
            )}>
              <CalendarIcon className="h-3 w-3" />
              {getDueDateText()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Priority badge */}
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] capitalize border transition-colors', getPriorityColor(todo.priority))}>
            {todo.priority}
          </span>
          {/* Goal badge */}
          {linkedGoal && (
            <span 
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-secondary text-foreground/50"
              title={linkedGoal.title}
            >
              <Target className="h-3 w-3" />
              <span className="truncate max-w-[60px]">{linkedGoal.title.slice(0, 8)}</span>
            </span>
          )}
          {/* Category */}
          {todo.category && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground/50 text-[10px]">
              <Tag className="h-3 w-3" />
              {todo.category}
            </span>
          )}
          {/* Tags */}
          {todo.tags && todo.tags.length > 0 && (
            <>
              {todo.tags.slice(0, 1).map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground/50 text-[10px]">
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
              {todo.tags.length > 1 && (
                <span className="text-[10px]">+{todo.tags.length - 1}</span>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// View Todo Content
interface ViewTodoContentProps {
  todo: Todo;
  goals: Goal[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onLinkGoal: () => void;
}

function ViewTodoContent({ todo, goals, onEdit, onDelete, onToggle, onLinkGoal }: ViewTodoContentProps) {
  const isOverdue = todo.dueDate && isPast(todo.dueDate) && !isToday(todo.dueDate) && !todo.completed;
  const linkedGoal = goals.find(g => g.taskIds?.includes(todo.id));

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between gap-4 pt-4">
          <div className="flex-1 flex items-start gap-3">
            <Checkbox
              checked={todo.completed}
              onClick={onToggle}
              className="mt-1 border-muted-foreground/40"
            />
            <DialogTitle className={cn(
              "text-xl text-foreground",
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
                  onClick={onLinkGoal}
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

      <div className="max-h-[60vh] pr-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-2">
          {todo.description && (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{todo.description}</p>
            </div>
          )}

          {/* Bottom section: Dates on left; Category, Priority and Goal on right */}
          <div className="flex items-center justify-between text-xs pt-3 text-muted-foreground border-t border-border">
            {/* Left side: Dates */}
            <div className="flex items-center gap-2 min-w-0">
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
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Priority tag */}
              <span
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] capitalize border backdrop-blur-sm",
                  todo.priority === 'high' && "bg-red-500/50 text-red-400 border border-red-500",
                  todo.priority === 'medium' && "bg-yellow-500/50 text-yellow-500 border border-yellow-500",
                  todo.priority === 'low' && "bg-blue-500/50 text-blue-400 border border-blue-500"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {todo.priority}
              </span>

              {/* Goal tag */}
              {linkedGoal && (
                <span
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] bg-secondary text-foreground/50"
                >
                  <Target className="h-3 w-3" />
                  {linkedGoal.title}
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
