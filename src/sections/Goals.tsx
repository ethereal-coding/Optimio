import { useState, useEffect } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Target,
  Search,
  Plus,
  Trophy,
  Calendar as CalendarIcon,
  Edit2,
  Trash2,
  CheckCircle2,
  Tag,
  Circle,
  PlayCircle,
  ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { Input } from '@/components/ui/input';
import { AddGoalForm } from '@/components/AddGoalForm';
import type { Goal } from '@/types';
import { addGoalWithSync, updateGoalWithSync, deleteGoalWithSync, addTaskToGoalWithSync, removeTaskFromGoalWithSync } from '@/lib/goal-sync';
import { toggleTodoWithSync, addTodoWithSync, deleteTodoWithSync } from '@/lib/todo-sync';
import type { Todo } from '@/types';



export function Goals() {
  const { state, dispatch } = useAppState();
  const { goals, todos } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Auto-open goal from search
  useEffect(() => {
    if (state.selectedItemToOpen?.type === 'goal') {
      const goal = state.goals.find(g => g.id === state.selectedItemToOpen!.id);
      if (goal) {
        setSelectedGoal(goal);
        dispatch(actions.setSelectedItemToOpen(null));
      }
    }
  }, [state.selectedItemToOpen, state.goals, dispatch]);

  // Helper function to calculate goal progress based on tasks
  const getGoalProgress = (goal: Goal) => {
    const goalTasks = todos.filter(t => goal.taskIds?.includes(t.id));
    if (goalTasks.length === 0) return 0;
    const completedTasks = goalTasks.filter(t => t.completed).length;
    return Math.round((completedTasks / goalTasks.length) * 100);
  };

  // Helper function to get goal status
  const getGoalStatus = (goal: Goal) => {
    const progress = getGoalProgress(goal);
    if (progress === 0) return 'not-started';
    if (progress >= 100) return 'completed';
    return 'in-progress';
  };

  // Filter goals based on search
  const filteredGoals = goals.filter(goal => {
    const matchesSearch =
      goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Group goals by status
  const notStartedGoals = filteredGoals.filter(g => getGoalStatus(g) === 'not-started');
  const inProgressGoals = filteredGoals.filter(g => getGoalStatus(g) === 'in-progress');
  const completedGoals = filteredGoals.filter(g => getGoalStatus(g) === 'completed');

  const handleAddGoal = async (goal: Goal) => {
    await addGoalWithSync(goal, dispatch, actions);
    setShowAddGoal(false);
  };

  const handleUpdateGoal = async (goal: Goal) => {
    await updateGoalWithSync(goal, dispatch, actions);
    setEditingGoal(null);
    setSelectedGoal(goal);
  };

  const handleDeleteGoal = async (goalId: string) => {
    await deleteGoalWithSync(goalId, dispatch, actions);
    setSelectedGoal(null);
  };

  const handleToggleTodo = async (todoId: string) => {
    await toggleTodoWithSync(todoId, dispatch, actions);
  };

  const handleCreateTask = async (title: string) => {
    if (!selectedGoal) return;
    
    // Create new task
    const { v4: uuidv4 } = await import('uuid');
    const newTask = {
      id: uuidv4(),
      title,
      completed: false,
      priority: 'medium' as const,
      createdAt: new Date(),
      goalId: selectedGoal.id
    };
    
    // Add task and link to goal
    await addTodoWithSync(newTask, dispatch, actions);
    await addTaskToGoalWithSync(selectedGoal.id, newTask.id, dispatch, actions);
  };

  const handleDeleteTask = async (todoId: string) => {
    await deleteTodoWithSync(todoId, dispatch, actions);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
              <Target className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Goals</h1>
              <p className="text-xs text-muted-foreground">{filteredGoals.length} {filteredGoals.length === 1 ? 'goal' : 'goals'}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddGoal(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search goals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:bg-accent focus:border-border focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Goals Board */}
      <div className="flex-1 p-0 overflow-x-auto overflow-y-hidden custom-scrollbar">
        {filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No goals found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Start by creating your first goal'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowAddGoal(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            )}
          </div>
        ) : (
          <div className="flex h-full min-w-[900px] divide-x divide-border">
            {/* Not Started Column */}
            <div className="flex-1 flex flex-col min-w-[280px]">
              <div className="text-center text-sm font-medium text-muted-foreground py-3 border-b border-border flex items-center justify-center gap-2">
                <Circle className="h-4 w-4" />
                <span>Not Started</span>
                <span className="text-xs bg-secondary px-2 py-0.5 rounded-md">
                  {notStartedGoals.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar p-4">
                {notStartedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    todos={todos}
                    onClick={() => setSelectedGoal(goal)}
                  />
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="flex-1 flex flex-col min-w-[280px]">
              <div className="text-center text-sm font-medium text-muted-foreground py-3 border-b border-border flex items-center justify-center gap-2">
                <PlayCircle className="h-4 w-4 text-blue-400" />
                <span>In Progress</span>
                <span className="text-xs bg-secondary px-2 py-0.5 rounded-md">
                  {inProgressGoals.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar p-4">
                {inProgressGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    todos={todos}
                    onClick={() => setSelectedGoal(goal)}
                  />
                ))}
              </div>
            </div>

            {/* Completed Column */}
            <div className="flex-1 flex flex-col min-w-[280px]">
              <div className="text-center text-sm font-medium text-muted-foreground py-3 border-b border-border flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span>Completed</span>
                <span className="text-xs bg-secondary px-2 py-0.5 rounded-md">
                  {completedGoals.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar p-4">
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    todos={todos}
                    onClick={() => setSelectedGoal(goal)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Goal</DialogTitle>
          </DialogHeader>
          <AddGoalForm onSubmit={handleAddGoal} onCancel={() => setShowAddGoal(false)} />
        </DialogContent>
      </Dialog>

      {/* View Goal Dialog */}
      <Dialog open={!!selectedGoal && !editingGoal} onOpenChange={(open) => {
        if (!open) {
          setSelectedGoal(null);
          setEditingGoal(null);
        }
      }}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh]" showCloseButton={false}>
          {selectedGoal && (
            <ViewGoalContent
              goal={selectedGoal}
              todos={todos}
              onEdit={() => setEditingGoal(selectedGoal)}
              onDelete={() => handleDeleteGoal(selectedGoal.id)}
              onToggleTodo={(todoId) => handleToggleTodo(todoId)}
              onAddTask={(todoId) => addTaskToGoalWithSync(selectedGoal.id, todoId, dispatch, actions)}
              onRemoveTask={(todoId) => removeTaskFromGoalWithSync(selectedGoal.id, todoId, dispatch, actions)}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
              onClose={() => {
                setSelectedGoal(null);
                setEditingGoal(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => {
        if (!open) {
          setEditingGoal(null);
        }
      }}>
        <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
          {editingGoal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">Edit Goal</DialogTitle>
              </DialogHeader>
              <AddGoalForm
                initialGoal={editingGoal}
                onSubmit={handleUpdateGoal}
                onCancel={() => setEditingGoal(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Goal Card Component
interface GoalCardProps {
  goal: Goal;
  todos: Todo[];
  onClick: () => void;
}

function GoalCard({ goal, todos, onClick }: GoalCardProps) {
  const goalTasks = todos.filter(t => goal.taskIds?.includes(t.id));
  const totalTasks = goalTasks.length;
  const completedTasks = goalTasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const daysLeft = goal.deadline ? differenceInDays(goal.deadline, new Date()) : null;
  const isCompleted = progress >= 100;

  return (
    <Card
      onClick={onClick}
      className="p-4 bg-card border-border hover:border-border transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: goal.color }}
            />
            <h3 className="text-sm font-medium text-foreground truncate">{goal.title}</h3>
            {isCompleted && <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
          </div>

          {goal.description && (
            <p className="text-xs text-foreground/50 line-clamp-1 mb-3 ml-5">{goal.description}</p>
          )}

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-foreground/50 text-xs">
                  {totalTasks === 0 ? 'No tasks' : `${completedTasks} / ${totalTasks} tasks`}
                </span>
                <span className="font-semibold text-sm" style={{ color: goal.color }}>
                  {progress}%
                </span>
              </div>
              <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: goal.color
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground ml-5">
            {totalTasks > 0 && (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {completedTasks}/{totalTasks} tasks
              </span>
            )}
            {goal.category && (
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                {goal.category}
              </span>
            )}
            {daysLeft !== null && (
              <span className={cn(
                "flex items-center gap-1.5",
                daysLeft < 7 && 'text-red-400',
                daysLeft >= 7 && daysLeft < 30 && 'text-yellow-400'
              )}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// View Goal Content
interface ViewGoalContentProps {
  goal: Goal;
  todos: Todo[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleTodo: (todoId: string) => void;
  onAddTask: (todoId: string) => void;
  onRemoveTask: (todoId: string) => void;
  onCreateTask: (title: string) => void;
  onDeleteTask: (todoId: string) => void;
  onClose: () => void;
}

function ViewGoalContent({ goal, todos, onEdit, onDelete, onToggleTodo, onAddTask, onRemoveTask, onCreateTask, onDeleteTask }: ViewGoalContentProps) {
  const goalTasks = todos.filter(t => goal.taskIds?.includes(t.id));
  const availableTasks = todos.filter(t => !goal.taskIds?.includes(t.id) && !t.completed);
  const totalTasks = goalTasks.length;
  const completedTasks = goalTasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const daysLeft = goal.deadline ? differenceInDays(goal.deadline, new Date()) : null;
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between gap-4 pt-4">
          <div className="flex-1">
            <DialogTitle className="text-xl text-foreground">{goal.title}</DialogTitle>
            {goal.category && (
              <div className="flex items-center gap-2 mt-2">
                <Tag className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{goal.category}</span>
              </div>
            )}
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

      <div className="max-h-[60vh] pr-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="p-4 rounded-lg bg-background border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-3xl font-bold" style={{ color: goal.color }}>
                {progress}%
              </span>
            </div>
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden mb-3">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: goal.color
                }}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {totalTasks === 0 ? 'No tasks assigned' : `${completedTasks} of ${totalTasks} tasks completed`}
            </div>
          </div>

          {/* Description */}
          {goal.description && (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{goal.description}</p>
            </div>
          )}

          {/* Associated Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Associated Tasks</label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateTask(!showCreateTask);
                    setShowAddTask(false);
                  }}
                  className="h-7 text-xs"
                >
                  {showCreateTask ? 'Cancel' : 'New Task'}
                </Button>
                {availableTasks.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddTask(!showAddTask);
                      setShowCreateTask(false);
                    }}
                    className="h-7 text-xs"
                  >
                    {showAddTask ? 'Cancel' : 'Add Existing'}
                  </Button>
                )}
              </div>
            </div>

            {/* Create New Task Form */}
            {showCreateTask && (
              <div className="p-3 rounded-lg bg-background border border-border space-y-2">
                <Input
                  placeholder="Enter task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="bg-input border-border text-foreground h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskTitle.trim()) {
                      onCreateTask(newTaskTitle.trim());
                      setNewTaskTitle('');
                      setShowCreateTask(false);
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateTask(false);
                      setNewTaskTitle('');
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newTaskTitle.trim()) {
                        onCreateTask(newTaskTitle.trim());
                        setNewTaskTitle('');
                        setShowCreateTask(false);
                      }
                    }}
                    disabled={!newTaskTitle.trim()}
                    className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Create
                  </Button>
                </div>
              </div>
            )}

            {/* Add Task Dropdown */}
            {showAddTask && availableTasks.length > 0 && (
              <div className="p-2 rounded-lg bg-background border border-border">
                <select
                  className="w-full bg-transparent text-sm text-foreground outline-none"
                  onChange={(e) => {
                    if (e.target.value) {
                      onAddTask(e.target.value);
                      setShowAddTask(false);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select a task to add...</option>
                  {availableTasks.map(task => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Task List */}
            {goalTasks.length > 0 ? (
              <div className="space-y-2">
                {goalTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border hover:border-border transition-colors group"
                  >
                    <Checkbox
                      checked={task.completed}
                      onClick={() => onToggleTodo(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "text-sm text-foreground truncate block",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </span>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-1">
                        <span>Created {format(task.createdAt, 'MMM d, yyyy')}</span>
                        {task.dueDate && (
                          <span>Due {format(task.dueDate, 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onRemoveTask(task.id)}
                        title="Unlink from goal"
                      >
                        <Target className="h-3 w-3 text-muted-foreground hover:text-yellow-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onDeleteTask(task.id)}
                        title="Delete task"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks associated with this goal
              </p>
            )}
          </div>

          {/* Bottom section: Dates and category on left; Task count on right */}
          <div className="flex items-center justify-between gap-2 text-[10px] pt-2 text-muted-foreground border-t border-border">
            <div className="flex items-center gap-2 min-w-0">
              <span>Created {format(goal.createdAt, 'MMM d, yyyy')}</span>
              {goal.deadline && (
                <>
                  <span>•</span>
                  <span className={cn(
                    daysLeft !== null && daysLeft < 7 && "text-red-400",
                    daysLeft !== null && daysLeft >= 7 && daysLeft < 30 && "text-yellow-400"
                  )}>
                    Due {format(goal.deadline, 'MMM d, yyyy')}
                  </span>
                </>
              )}
              {goal.category && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground/50 text-[10px]">
                    <Tag className="h-3 w-3" />
                    {goal.category}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] bg-secondary text-muted-foreground"
              >
                <ListTodo className="h-3 w-3" />
                {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
