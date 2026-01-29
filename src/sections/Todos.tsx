import { useState, useEffect } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckSquare,
  Search,
  Plus,
  Calendar as CalendarIcon,
  Grid3x3,
  List,
  Edit2,
  TrendingUp,
  Trophy,
  Trash2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { AddTodoForm } from '@/components/AddTodoForm';
import type { Todo } from '@/types';

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'active' | 'completed';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

export function Todos() {
  const { state, dispatch } = useAppState();
  const { todos, todosViewMode } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // Auto-open todo from search
  useEffect(() => {
    if (state.selectedItemToOpen?.type === 'todo') {
      const todo = state.todos.find(t => t.id === state.selectedItemToOpen.id);
      if (todo) {
        setSelectedTodo(todo);
        dispatch(actions.setSelectedItemToOpen(null));
      }
    }
  }, [state.selectedItemToOpen, state.todos, dispatch]);

  // Filter todos
  const filteredTodos = todos.filter(todo => {
    const matchesSearch =
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.category?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'active' && todo.completed) return false;
    if (filterMode === 'completed' && !todo.completed) return false;

    if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false;

    return true;
  });

  const handleAddTodo = (todo: Todo) => {
    dispatch(actions.addTodo(todo));
    setShowAddTodo(false);
  };

  const handleUpdateTodo = (todo: Todo) => {
    dispatch(actions.updateTodo(todo));
    setEditingTodo(null);
    setSelectedTodo(todo);
  };

  const handleDeleteTodo = (todoId: string) => {
    dispatch(actions.deleteTodo(todoId));
    setSelectedTodo(null);
  };

  const handleToggleTodo = (todoId: string) => {
    dispatch(actions.toggleTodo(todoId));
    const updatedTodo = todos.find(t => t.id === todoId);
    if (updatedTodo && selectedTodo?.id === todoId) {
      setSelectedTodo({ ...updatedTodo, completed: !updatedTodo.completed });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
              <p className="text-xs text-muted-foreground">{filteredTodos.length} {filteredTodos.length === 1 ? 'task' : 'tasks'}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddTodo(true)}
            className="bg-white text-black hover:bg-white/90 h-10 px-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
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
              onClick={() => setFilterMode('active')}
              className={cn(
                "h-8 text-xs transition-colors",
                filterMode === 'active'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Active
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterMode('completed')}
              className={cn(
                "h-8 text-xs transition-colors",
                filterMode === 'completed'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Trophy className="h-3 w-3 mr-1" />
              Completed
            </Button>
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
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-red-500" />
              High
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPriorityFilter('medium')}
              className={cn(
                "h-8 text-xs transition-colors gap-1",
                priorityFilter === 'medium'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Medium
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPriorityFilter('low')}
              className={cn(
                "h-8 text-xs transition-colors gap-1",
                priorityFilter === 'low'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Low
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(actions.setTodosViewMode('grid'))}
              className={cn(
                "h-8 w-8 transition-colors",
                todosViewMode === 'grid'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(actions.setTodosViewMode('list'))}
              className={cn(
                "h-8 w-8 transition-colors",
                todosViewMode === 'list'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Todos Grid/List */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
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
          <div className={cn(
            todosViewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-2 max-w-3xl'
          )}>
            {filteredTodos.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                viewMode={todosViewMode}
                onClick={() => setSelectedTodo(todo)}
                onToggle={() => handleToggleTodo(todo.id)}
                getPriorityColor={getPriorityColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Todo Dialog */}
      <Dialog open={showAddTodo} onOpenChange={setShowAddTodo}>
        <DialogContent className="bg-card border-border max-w-3xl">
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
        <DialogContent className="bg-card border-border max-w-3xl">
          {selectedTodo && (
            <ViewTodoContent
              todo={selectedTodo}
              onEdit={() => setEditingTodo(selectedTodo)}
              onDelete={() => handleDeleteTodo(selectedTodo.id)}
              onToggle={() => handleToggleTodo(selectedTodo.id)}
              onClose={() => {
                setSelectedTodo(null);
                setEditingTodo(null);
              }}
              getPriorityColor={getPriorityColor}
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
        <DialogContent className="bg-card border-border max-w-3xl">
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
    </div>
  );
}

// Todo Card Component
interface TodoCardProps {
  todo: Todo;
  viewMode: ViewMode;
  onClick: () => void;
  onToggle: (e: React.MouseEvent) => void;
  getPriorityColor: (priority: string) => string;
}

function TodoCard({ todo, viewMode, onClick, onToggle, getPriorityColor }: TodoCardProps) {
  const isOverdue = todo.dueDate && isPast(todo.dueDate) && !isToday(todo.dueDate) && !todo.completed;

  const getDueDateText = () => {
    if (!todo.dueDate) return null;
    if (isToday(todo.dueDate)) return 'Today';
    if (isTomorrow(todo.dueDate)) return 'Tomorrow';
    if (isOverdue) return 'Overdue';
    return format(todo.dueDate, 'MMM d');
  };

  if (viewMode === 'list') {
    return (
      <Card
        onClick={onClick}
        className="p-3 bg-card border-border hover:border-border transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <Checkbox
            checked={todo.completed}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(e);
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', getPriorityColor(todo.priority))} />
              <h3 className={cn(
                "text-sm text-foreground truncate",
                todo.completed && "line-through text-muted-foreground"
              )}>
                {todo.title}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {todo.category && (
                <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground/50">
                  {todo.category}
                </span>
              )}
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
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      className="p-4 bg-card border-border hover:border-border transition-all cursor-pointer group flex flex-col h-[160px]"
    >
      <div className="flex items-start gap-3 mb-3">
        <Checkbox
          checked={todo.completed}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(e);
          }}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('h-2 w-2 rounded-full flex-shrink-0', getPriorityColor(todo.priority))} />
            <h3 className={cn(
              "text-base font-medium text-foreground truncate",
              todo.completed && "line-through text-muted-foreground"
            )}>
              {todo.title}
            </h3>
          </div>
          {todo.description && (
            <p className={cn(
              "text-sm text-foreground/50 line-clamp-2",
              todo.completed && "text-muted-foreground"
            )}>
              {todo.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
        {todo.category && (
          <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground">
            {todo.category}
          </span>
        )}
        {todo.dueDate && (
          <span className={cn(
            "flex items-center gap-1 text-[10px]",
            isOverdue ? "text-red-400" : "text-muted-foreground"
          )}>
            <CalendarIcon className="h-3 w-3" />
            {getDueDateText()}
          </span>
        )}
      </div>
    </Card>
  );
}

// View Todo Content
interface ViewTodoContentProps {
  todo: Todo;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onClose: () => void;
  getPriorityColor: (priority: string) => string;
}

function ViewTodoContent({ todo, onEdit, onDelete, onToggle, getPriorityColor }: ViewTodoContentProps) {
  const isOverdue = todo.dueDate && isPast(todo.dueDate) && !isToday(todo.dueDate) && !todo.completed;

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between gap-4 pt-4">
          <div className="flex-1 flex items-start gap-3">
            <Checkbox
              checked={todo.completed}
              onClick={onToggle}
              className="mt-1"
            />
            <DialogTitle className={cn(
              "text-xl text-foreground",
              todo.completed && "line-through text-muted-foreground"
            )}>
              {todo.title}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogHeader>

      <div className="border-t border-border -mt-4"></div>

      <div className="space-y-4 pt-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', getPriorityColor(todo.priority))} />
            <span className="text-muted-foreground capitalize">{todo.priority} Priority</span>
          </div>
          {todo.category && (
            <span className="px-2 py-1 rounded bg-secondary text-muted-foreground">
              {todo.category}
            </span>
          )}
        </div>

        {todo.description && (
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Description</label>
            <p className="text-sm text-foreground/70 leading-relaxed">{todo.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-muted-foreground block mb-1">Created</label>
            <span className="text-foreground/70">{format(todo.createdAt, 'MMM d, yyyy')}</span>
          </div>
          {todo.dueDate && (
            <div>
              <label className="text-muted-foreground block mb-1">Due Date</label>
              <span className={cn(
                "text-foreground/70 flex items-center gap-1",
                isOverdue && "text-red-400"
              )}>
                {isOverdue && <AlertCircle className="h-3 w-3" />}
                {format(todo.dueDate, 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        {todo.completedAt && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckSquare className="h-4 w-4" />
              <span>Completed {formatDistanceToNow(todo.completedAt, { addSuffix: true })}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
