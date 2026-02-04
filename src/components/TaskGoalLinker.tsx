
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppState, actions } from '@/hooks/useAppState';
import { Target, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskGoalLinkerProps {
  todoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskGoalLinker({ todoId, open, onOpenChange }: TaskGoalLinkerProps) {
  const { state, dispatch } = useAppState();
  const { todos, goals } = state;
  
  const todo = todos.find(t => t.id === todoId);
  
  const handleToggleLink = (goalId: string, isLinked: boolean) => {
    if (isLinked) {
      dispatch(actions.removeTaskFromGoal(goalId, todoId));
    } else {
      dispatch(actions.addTaskToGoal(goalId, todoId));
    }
  };

  if (!todo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-lg max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Task to Goals
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Link "{todo.title}" to goals:
          </p>
          
          {goals.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No goals available</p>
              <p className="text-xs mt-1">Create a goal first to link tasks</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {goals.map(goal => {
                const isLinked = goal.taskIds?.includes(todoId);
                const progress = Math.round(((goal.currentValue ?? 0) / (goal.targetValue || 1)) * 100);
                
                return (
                  <div
                    key={goal.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                      isLinked 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-secondary/30 border-border hover:bg-secondary/50'
                    )}
                  >
                    <Checkbox
                      checked={isLinked}
                      onCheckedChange={() => handleToggleLink(goal.id, !!isLinked)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {goal.title}
                        </span>
                        {isLinked && (
                          <Link2 className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${Math.min(progress, 100)}%`,
                              backgroundColor: goal.color || '#8b5cf6'
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
