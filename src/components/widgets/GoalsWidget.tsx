import React, { useState } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, Checkbox, Input } from '@/components/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Target,
  Plus,
  TrendingUp,
  ChevronRight,
  Trophy,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  PlayCircle,
  ListTodo,
  Calendar as CalendarIcon,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddGoalForm } from '@/components/forms/AddGoalForm';
import { addGoalWithSync, updateGoalWithSync, deleteGoalWithSync, updateGoalProgressWithSync, addTaskToGoalWithSync, removeTaskFromGoalWithSync } from '@/lib/goal-sync';
import { toggleTodoWithSync, addTodoWithSync, deleteTodoWithSync } from '@/lib/todo-sync';
import type { Goal } from '@/types';

interface GoalsWidgetProps {
  className?: string;
}

export const GoalsWidget = React.memo(function GoalsWidget({ className }: GoalsWidgetProps) {
  const { state, dispatch } = useAppState();
  const { goals } = state;
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<typeof goals[0] | null>(null);
  const [editingGoal, setEditingGoal] = useState<typeof goals[0] | null>(null);

  const handleAddGoal = async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addGoalWithSync(goal, dispatch, actions);
    setShowAddGoal(false);
  };

  const handleUpdateProgress = async (goalId: string, newValue: number) => {
    await updateGoalProgressWithSync(goalId, newValue, dispatch, actions);
  };

  const handleDeleteGoal = async (goalId: string) => {
    await deleteGoalWithSync(goalId, dispatch, actions);
    setSelectedGoal(null);
    setExpandedGoal(null);
  };

  const handleUpdateGoal = async (goal: Goal) => {
    await updateGoalWithSync(goal, dispatch, actions);
    setEditingGoal(null);
    setSelectedGoal(goal);
  };

  return (
    <Card className={cn("bg-card border-border rounded-lg w-full h-full flex flex-col", className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-foreground">Goals</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    onClick={() => setShowAddGoal(true)}
                    aria-label="Add new goal"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                  Add new goal
                </TooltipContent>
              </Tooltip>
              <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle className="text-foreground">Create New Goal</DialogTitle>
                </DialogHeader>
                <AddGoalForm onSubmit={handleAddGoal} onCancel={() => setShowAddGoal(false)} />
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-secondary h-7 gap-1"
              onClick={() => dispatch(actions.setView('goals'))}
              aria-label="View all goals"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden min-w-0">
        <ScrollArea className="h-full w-full pr-3">
          <div className="pb-2">
          {goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No goals yet</p>
              <p className="text-xs mt-1 text-foreground/20">Set your first goal to get started</p>
            </div>
          ) : (
            <div className="space-y-2" role="list">
              {goals.map((goal) => {
                const progress = Math.round(((goal.currentValue ?? 0) / (goal.targetValue || 1)) * 100);
                const daysLeft = goal.deadline ? differenceInDays(goal.deadline, new Date()) : null;
                const isExpanded = expandedGoal === goal.id;
                const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;

                return (
                  <div
                    key={goal.id}
                    className="p-3 rounded-md bg-card border border-border hover:border-border-strong hover:bg-secondary/30 transition-colors cursor-pointer flex flex-col gap-2"
                    onClick={() => setSelectedGoal(goal)}
                    role="listitem"
                    aria-label={`${goal.title}, ${progress}% complete`}
                  >
                    {/* Top row: Title + Progress percentage */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm text-foreground font-medium truncate">{goal.title}</h4>
                          {progress >= 100 && (
                            <Trophy className="h-4 w-4 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <span className="text-base font-semibold flex-shrink-0 text-foreground">
                        {progress}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div 
                      className="relative h-1.5 bg-secondary rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${goal.title} progress: ${progress}%`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 bg-primary"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>

                    {/* Bottom row: Meta info */}
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50 mt-auto">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{completedMilestones}/{goal.milestones.length} milestones</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{(goal.currentValue ?? 0).toLocaleString()} / {(goal.targetValue ?? 0).toLocaleString()} {goal.unit}</span>
                        {daysLeft !== null && (
                          <span className={cn(
                            'ml-2',
                            
                            
                          )}>
                            • {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Milestones */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                        <p className="text-xs text-muted-foreground mb-2">Milestones</p>
                        {goal.milestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            className={cn(
                              'flex items-center gap-2 text-sm',
                              milestone.isCompleted && 'text-muted-foreground line-through'
                            )}
                          >
                            <div className={cn(
                              'h-3.5 w-3.5 rounded-full flex items-center justify-center',
                              milestone.isCompleted ? 'bg-green-500/20' : 'bg-secondary'
                            )}>
                              {milestone.isCompleted ? (
                                <TrendingUp className="h-2 w-2" />
                              ) : (
                                <div className="h-1.5 w-1.5 rounded-full bg-muted" />
                              )}
                            </div>
                            <span className="flex-1 text-muted-foreground text-sm">{milestone.title}</span>
                            {milestone.isCompleted && milestone.completedAt && (
                              <span className="text-[10px] text-muted-foreground">
                                {format(milestone.completedAt, 'MMM d')}
                              </span>
                            )}
                          </div>
                        ))}

                        {/* Quick Progress Update */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                          <span className="text-xs text-muted-foreground">Update:</span>
                          <div className="flex gap-0.5">
                            {[25, 50, 75, 100].map((pct) => (
                              <Button
                                key={pct}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground hover:bg-secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateProgress(goal.id, Math.round(goal.targetValue * pct / 100));
                                }}
                                aria-label={`Set ${goal.title} progress to ${pct}%`}
                              >
                                {pct}%
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </ScrollArea>
      </CardContent>

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
              onEdit={() => setEditingGoal(selectedGoal)}
              onDelete={() => handleDeleteGoal(selectedGoal.id)}
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
    </Card>
  );
});


// View Goal Content Component
interface ViewGoalContentProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function ViewGoalContent({ goal, onEdit, onDelete }: ViewGoalContentProps) {
  const { state, dispatch } = useAppState();
  const { todos } = state;
  const goalTasks = todos.filter(t => goal.taskIds?.includes(t.id));
  const availableTasks = todos.filter(t => !goal.taskIds?.includes(t.id) && !t.completed);
  const totalTasks = goalTasks.length;
  const completedTasks = goalTasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const daysLeft = goal.deadline ? differenceInDays(goal.deadline, new Date()) : null;
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleToggleTodo = async (todoId: string) => {
    await toggleTodoWithSync(todoId, dispatch, actions);
  };

  const handleAddTask = async (todoId: string) => {
    await addTaskToGoalWithSync(goal.id, todoId, dispatch, actions);
  };

  const handleRemoveTask = async (todoId: string) => {
    await removeTaskFromGoalWithSync(goal.id, todoId, dispatch, actions);
  };

  const handleCreateTask = async (title: string) => {
    const newTodo = await addTodoWithSync({
      title,
      description: '',
      priority: 'medium',
      status: 'not-started',
      completed: false,
    }, dispatch, actions);
    if (newTodo) {
      await addTaskToGoalWithSync(goal.id, newTodo.id, dispatch, actions);
    }
  };

  const handleDeleteTask = async (todoId: string) => {
    await deleteTodoWithSync(todoId, dispatch, actions);
  };

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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  onClick={onEdit}
                  aria-label="Edit goal"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                Edit goal
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  onClick={onDelete}
                  aria-label="Delete goal"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="bg-popover border-border text-foreground">
                Delete goal
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </DialogHeader>

      <div className="max-h-[60vh] pr-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="p-4 rounded-md bg-background border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-3xl font-bold text-foreground">
                {progress}%
              </span>
            </div>
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden mb-3">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all bg-primary"
                style={{ width: `${Math.min(progress, 100)}%` }}
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
              <div className="p-3 rounded-md bg-background border border-border space-y-2">
                <Input
                  placeholder="Enter task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="bg-input border-border text-foreground h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskTitle.trim()) {
                      handleCreateTask(newTaskTitle.trim());
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
                        handleCreateTask(newTaskTitle.trim());
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
              <div className="p-2 rounded-md bg-background border border-border">
                <select
                  className="w-full bg-transparent text-sm text-foreground outline-none"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddTask(e.target.value);
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
                    className="flex items-center gap-3 p-2.5 rounded-md bg-card border border-border hover:border-border-strong hover:bg-secondary/30 transition-colors group"
                  >
                    <Checkbox
                      checked={task.completed}
                      onClick={() => handleToggleTodo(task.id)}
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
                        onClick={() => handleRemoveTask(task.id)}
                        title="Unlink from goal"
                      >
                        <Target className="h-3 w-3 text-muted-foreground hover:text-yellow-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteTask(task.id)}
                        title="Delete task"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-md">
                <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks assigned to this goal</p>
                <p className="text-xs mt-1">Create a new task or add an existing one</p>
              </div>
            )}
          </div>

          {/* Milestones */}
          {goal.milestones.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Milestones</label>
              <div className="space-y-2">
                {goal.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-3 p-2.5 rounded-md bg-card border border-border"
                  >
                    <div className={cn(
                      'h-3.5 w-3.5 rounded-full flex items-center justify-center',
                      milestone.isCompleted ? 'bg-green-500/20' : 'bg-secondary'
                    )}>
                      {milestone.isCompleted ? (
                        <TrendingUp className="h-2 w-2 text-green-500" />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-muted" />
                      )}
                    </div>
                    <span className={cn(
                      "flex-1 text-sm",
                      milestone.isCompleted && "line-through text-muted-foreground"
                    )}>
                      {milestone.title}
                    </span>
                    {milestone.isCompleted && milestone.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        {format(milestone.completedAt, 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
