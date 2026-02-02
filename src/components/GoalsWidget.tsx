import { useState } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Target,
  Plus,
  TrendingUp,
  ChevronRight,
  Trophy,
  Edit2,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddGoalForm } from './AddGoalForm';
import { addGoalWithSync, updateGoalWithSync, deleteGoalWithSync, updateGoalProgressWithSync } from '@/lib/goal-sync';

export function GoalsWidget() {
  const { state, dispatch } = useAppState();
  const { goals } = state;
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<typeof goals[0] | null>(null);
  const [editingGoal, setEditingGoal] = useState<typeof goals[0] | null>(null);

  const handleAddGoal = async (goal: any) => {
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

  const handleUpdateGoal = async (goal: any) => {
    await updateGoalWithSync(goal, dispatch, actions);
    setEditingGoal(null);
    setSelectedGoal(goal);
  };

  return (
    <Card className="bg-card border-border rounded-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-foreground">Goals</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => setShowAddGoal(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Add New Goal</DialogTitle>
                </DialogHeader>
                <AddGoalForm onSubmit={handleAddGoal} onCancel={() => setShowAddGoal(false)} />
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-secondary h-7 gap-1"
              onClick={() => dispatch(actions.setView('goals'))}
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[300px] pr-3">
          <div className="pb-2">
          {goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No goals yet</p>
              <p className="text-xs mt-1 text-foreground/20">Set your first goal to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => {
                const progress = Math.round(((goal.currentValue ?? 0) / (goal.targetValue || 1)) * 100);
                const daysLeft = goal.deadline ? differenceInDays(goal.deadline, new Date()) : null;
                const isExpanded = expandedGoal === goal.id;
                const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;

                return (
                  <div
                    key={goal.id}
                    className="p-3 rounded-md bg-card border border-border hover:border-border-strong hover:bg-secondary/30 transition-all cursor-pointer flex flex-col gap-2"
                    onClick={() => setSelectedGoal(goal)}
                  >
                    {/* Top row: Title + Progress percentage */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm text-foreground font-medium truncate">{goal.title}</h4>
                          {progress >= 100 && (
                            <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <span className="text-base font-semibold flex-shrink-0 text-foreground">
                        {progress}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
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
                            daysLeft < 7 && 'text-red-400',
                            daysLeft < 30 && daysLeft >= 7 && 'text-yellow-400'
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
                                <TrendingUp className="h-2 w-2 text-green-400" />
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

      {/* Goal Detail Dialog */}
      <Dialog open={!!selectedGoal && !editingGoal} onOpenChange={(open) => {
        if (!open) {
          setSelectedGoal(null);
          setEditingGoal(null);
        }
      }}>
        <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
          {selectedGoal && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pt-4">
                  <DialogTitle className="text-lg text-foreground flex-1">{selectedGoal.title}</DialogTitle>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={() => setEditingGoal(selectedGoal)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => handleDeleteGoal(selectedGoal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="border-t border-border -mt-4"></div>

              <div className="space-y-4 pt-3">
                {/* Progress Overview */}
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-3xl font-bold" style={{ color: selectedGoal.color }}>
                      {Math.round(((selectedGoal.currentValue ?? 0) / (selectedGoal.targetValue || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="relative h-3 bg-secondary rounded-full overflow-hidden mb-3">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all"
                      style={{
                        width: `${Math.min(((selectedGoal.currentValue ?? 0) / (selectedGoal.targetValue || 1)) * 100, 100)}%`,
                        backgroundColor: selectedGoal.color
                      }}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(selectedGoal.currentValue ?? 0).toLocaleString()} / {(selectedGoal.targetValue ?? 0).toLocaleString()} {selectedGoal.unit}
                  </div>
                </div>

                {selectedGoal.description && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Description</label>
                    <p className="text-sm text-foreground/70 leading-relaxed">{selectedGoal.description}</p>
                  </div>
                )}

                {selectedGoal.milestones.length > 0 && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Milestones</label>
                    <div className="space-y-2">
                      {selectedGoal.milestones.map((milestone: any) => (
                        <div
                          key={milestone.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div className={cn(
                            'h-3.5 w-3.5 rounded-full flex items-center justify-center',
                            milestone.isCompleted ? 'bg-green-500/20' : 'bg-secondary'
                          )}>
                            {milestone.isCompleted ? (
                              <TrendingUp className="h-2 w-2 text-green-400" />
                            ) : (
                              <div className="h-1.5 w-1.5 rounded-full bg-muted" />
                            )}
                          </div>
                          <span className={cn(
                            "flex-1 text-muted-foreground",
                            milestone.isCompleted && "line-through text-muted-foreground"
                          )}>
                            {milestone.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => {
        if (!open) {
          setEditingGoal(null);
        }
      }}>
        <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
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
}
