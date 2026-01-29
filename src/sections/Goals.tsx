import { useState, useEffect } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
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
  TrendingUp,
  Calendar as CalendarIcon,
  Grid3x3,
  List,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { AddGoalForm } from '@/components/AddGoalForm';
import type { Goal } from '@/types';

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'active' | 'completed';

export function Goals() {
  const { state, dispatch } = useAppState();
  const { goals, goalsViewMode } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Auto-open goal from search
  useEffect(() => {
    if (state.selectedItemToOpen?.type === 'goal') {
      const goal = state.goals.find(g => g.id === state.selectedItemToOpen.id);
      if (goal) {
        setSelectedGoal(goal);
        dispatch(actions.setSelectedItemToOpen(null));
      }
    }
  }, [state.selectedItemToOpen, state.goals, dispatch]);

  // Filter goals based on search and filter mode
  const filteredGoals = goals.filter(goal => {
    const matchesSearch =
      goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.category?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const progress = (goal.currentValue / goal.targetValue) * 100;

    if (filterMode === 'completed') return progress >= 100;
    if (filterMode === 'active') return progress < 100;
    return true;
  });

  const handleAddGoal = (goal: Goal) => {
    dispatch(actions.addGoal(goal));
    setShowAddGoal(false);
  };

  const handleUpdateGoal = (goal: Goal) => {
    dispatch(actions.updateGoal(goal));
    setEditingGoal(null);
    setSelectedGoal(goal);
  };

  const handleDeleteGoal = (goalId: string) => {
    dispatch(actions.deleteGoal(goalId));
    setSelectedGoal(null);
  };

  const handleUpdateProgress = (goalId: string, value: number) => {
    dispatch(actions.updateGoalProgress(goalId, value));
    const updatedGoal = goals.find(g => g.id === goalId);
    if (updatedGoal && selectedGoal?.id === goalId) {
      setSelectedGoal({ ...updatedGoal, currentValue: value });
    }
  };

  const handleToggleMilestone = (goalId: string, milestoneId: string) => {
    dispatch(actions.toggleMilestone(goalId, milestoneId));
    const updatedGoal = goals.find(g => g.id === goalId);
    if (updatedGoal && selectedGoal?.id === goalId) {
      setSelectedGoal(updatedGoal);
    }
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

          {/* Filter Buttons */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterMode('all')}
              className={cn(
                "h-8 text-xs transition-colors",
                filterMode === 'all'
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
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
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
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
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Trophy className="h-3 w-3 mr-1" />
              Completed
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(actions.setGoalsViewMode('grid'))}
              className={cn(
                "h-8 w-8 transition-colors",
                goalsViewMode === 'grid'
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(actions.setGoalsViewMode('list'))}
              className={cn(
                "h-8 w-8 transition-colors",
                goalsViewMode === 'list'
                  ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Goals Grid/List */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
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
          <div className={cn(
            goalsViewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3 max-w-5xl'
          )}>
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                viewMode={goalsViewMode}
                onClick={() => setSelectedGoal(goal)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent className="bg-card border-border max-w-3xl">
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
        <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh]">
          {selectedGoal && (
            <ViewGoalContent
              goal={selectedGoal}
              onEdit={() => setEditingGoal(selectedGoal)}
              onDelete={() => handleDeleteGoal(selectedGoal.id)}
              onUpdateProgress={(value) => handleUpdateProgress(selectedGoal.id, value)}
              onToggleMilestone={(milestoneId) => handleToggleMilestone(selectedGoal.id, milestoneId)}
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
        <DialogContent className="bg-card border-border max-w-3xl">
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
  viewMode: ViewMode;
  onClick: () => void;
}

function GoalCard({ goal, viewMode, onClick }: GoalCardProps) {
  const progress = Math.round((goal.currentValue / goal.targetValue) * 100);
  const daysLeft = goal.deadline ? differenceInDays(goal.deadline, new Date()) : null;
  const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
  const isCompleted = progress >= 100;

  if (viewMode === 'list') {
    return (
      <Card
        onClick={onClick}
        className="p-5 bg-card border-border hover:border-border transition-all cursor-pointer group"
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
                    {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
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
              {goal.milestones.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {completedMilestones}/{goal.milestones.length} milestones
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

  return (
    <Card
      onClick={onClick}
      className="p-4 bg-card border-border hover:border-border transition-all cursor-pointer group flex flex-col h-[260px]"
    >
      {/* Top: Title and Progress */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground line-clamp-1 mb-1">
            {goal.title}
          </h3>
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: goal.color }}
            />
            <span className="text-[10px] text-muted-foreground">
              {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isCompleted && <Trophy className="h-4 w-4 text-yellow-500" />}
          <span className="text-2xl font-bold tracking-tight" style={{ color: goal.color }}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Description with Fade */}
      {goal.description && (
        <div className="relative mb-auto">
          <p className="text-xs text-foreground/50 line-clamp-3 leading-relaxed">
            {goal.description}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        </div>
      )}

      {/* Progress Bar and Metadata */}
      <div className="mt-auto space-y-3 pt-3 border-t border-border">
        <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: goal.color
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          {goal.milestones.length > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{completedMilestones}/{goal.milestones.length}</span>
            </span>
          )}
          {daysLeft !== null && (
            <span className={cn(
              "flex items-center gap-1.5 ml-auto",
              daysLeft < 7 && 'text-red-400',
              daysLeft >= 7 && daysLeft < 30 && 'text-yellow-400',
              daysLeft >= 30 && 'text-muted-foreground'
            )}>
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{daysLeft > 0 ? `${daysLeft}d` : 'Overdue'}</span>
            </span>
          )}
          {!goal.milestones.length && !daysLeft && goal.category && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              {goal.category}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// View Goal Content
interface ViewGoalContentProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateProgress: (value: number) => void;
  onToggleMilestone: (milestoneId: string) => void;
  onClose: () => void;
}

function ViewGoalContent({ goal, onEdit, onDelete, onUpdateProgress, onToggleMilestone }: ViewGoalContentProps) {
  const progress = Math.round((goal.currentValue / goal.targetValue) * 100);
  const [sliderValue, setSliderValue] = useState([goal.currentValue]);
  const daysLeft = goal.deadline ? differenceInDays(goal.deadline, new Date()) : null;

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

      <div className="border-t border-border -mt-4"></div>

      <div className="max-h-[60vh] pr-4 overflow-y-auto custom-scrollbar pt-3">
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
              {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
            </div>
          </div>

          {/* Update Progress */}
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">Update Progress</label>
            <div className="flex items-center gap-3">
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                max={goal.targetValue}
                step={goal.targetValue / 100}
                className="flex-1"
              />
              <Input
                type="number"
                value={sliderValue[0]}
                onChange={(e) => setSliderValue([parseFloat(e.target.value) || 0])}
                className="w-24 bg-input border-border text-foreground h-9"
              />
              <Button
                onClick={() => onUpdateProgress(sliderValue[0])}
                disabled={sliderValue[0] === goal.currentValue}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-9"
              >
                Save
              </Button>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            {goal.description && (
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Description</label>
                <p className="text-sm text-foreground/70 leading-relaxed">{goal.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-muted-foreground block mb-1">Created</label>
                <span className="text-foreground/70">{format(goal.createdAt, 'MMM d, yyyy')}</span>
              </div>
              {goal.deadline && (
                <div>
                  <label className="text-muted-foreground block mb-1">Deadline</label>
                  <span className={cn(
                    "text-foreground/70",
                    daysLeft !== null && daysLeft < 7 && "text-red-400",
                    daysLeft !== null && daysLeft >= 7 && daysLeft < 30 && "text-yellow-400"
                  )}>
                    {format(goal.deadline, 'MMM d, yyyy')}
                    {daysLeft !== null && ` (${daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'})`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Milestones */}
          {goal.milestones.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Milestones</label>
              <div className="space-y-2">
                {goal.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border hover:border-border transition-colors cursor-pointer"
                    onClick={() => onToggleMilestone(milestone.id)}
                  >
                    <Checkbox
                      checked={milestone.isCompleted}
                    />
                    <div className="flex-1">
                      <span className={cn(
                        "text-sm text-foreground",
                        milestone.isCompleted && "line-through text-muted-foreground"
                      )}>
                        {milestone.title}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({milestone.targetValue} {goal.unit})
                      </span>
                    </div>
                    {milestone.isCompleted && milestone.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(milestone.completedAt, { addSuffix: true })}
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
