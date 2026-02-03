import { useState } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { TodayOverview } from '@/components/TodayOverview';
import { CalendarWidget } from '@/components/CalendarWidget';
import { TodoWidget } from '@/components/TodoWidget';
import { GoalsWidget } from '@/components/GoalsWidget';
import { NotesWidget } from '@/components/NotesWidget';
import { QuickStats } from '@/components/QuickStats';
import { Notes } from '@/sections/Notes';
import { Goals } from '@/sections/Goals';
import { Todos } from '@/sections/Todos';
import { Calendar } from '@/sections/Calendar';
import { Settings } from '@/sections/Settings';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Calendar as CalendarIcon, CheckSquare, Target, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddTodoForm } from '@/components/AddTodoForm';
import { AddEventForm } from '@/components/AddEventForm';
import { AddGoalForm } from '@/components/AddGoalForm';
import { AddNoteForm } from '@/components/AddNoteForm';
import { addEventWithSync } from '@/lib/calendar-sync';
import { addTodoWithSync } from '@/lib/todo-sync';
import { addGoalWithSync } from '@/lib/goal-sync';
import { addNoteWithSync } from '@/lib/note-sync';

interface DashboardProps {
  onSearchOpen?: () => void;
}

export function Dashboard({ onSearchOpen }: DashboardProps) {
  const { state, dispatch } = useAppState();
  const [activeDialog, setActiveDialog] = useState<'todo' | 'event' | 'goal' | 'note' | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const handleAddTodo = async (todo: any) => {
    await addTodoWithSync(todo, dispatch, actions);
    setActiveDialog(null);
  };

  const handleAddEvent = async (event: any) => {
    await addEventWithSync('1', event, dispatch, actions);
    setActiveDialog(null);
  };

  const handleAddGoal = async (goal: any) => {
    await addGoalWithSync(goal, dispatch, actions);
    setActiveDialog(null);
  };

  const handleAddNote = async (note: any) => {
    await addNoteWithSync(note, dispatch, actions);
    setActiveDialog(null);
  };

  const toggleQuickAdd = () => {
    setIsQuickAddOpen(!isQuickAddOpen);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header onSearchOpen={onSearchOpen} />

          {/* Render different views based on state */}
          {state.view === 'notes' ? (
            <Notes />
          ) : state.view === 'goals' ? (
            <Goals />
          ) : state.view === 'todos' ? (
            <Todos />
          ) : state.view === 'calendar' ? (
            <Calendar />
          ) : state.view === 'settings' ? (
            <Settings />
          ) : (
            /* Dashboard Content */
            <main className="flex-1 overflow-auto custom-scrollbar p-4">
              <div className="w-full h-full flex flex-col gap-4">
                {/* Quick Stats Row */}
                <QuickStats />

                {/* Main Grid - Responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
                  {/* Today Overview - full width on mobile, 2 cols on xl */}
                  <div className="md:col-span-2 xl:col-span-2 h-[400px] md:h-[480px] xl:h-[520px]">
                    <TodayOverview />
                  </div>
                  
                  {/* Tasks - full width mobile, 1 col xl */}
                  <div className="h-[400px] md:h-[480px] xl:h-[520px]">
                    <TodoWidget />
                  </div>
                  
                  {/* Notes */}
                  <div className="h-[350px] md:h-[400px] xl:h-[450px]">
                    <NotesWidget />
                  </div>
                  
                  {/* Goals */}
                  <div className="h-[350px] md:h-[400px] xl:h-[450px]">
                    <GoalsWidget />
                  </div>
                  
                  {/* Calendar */}
                  <div className="h-[350px] md:h-[400px] xl:h-[450px]">
                    <CalendarWidget />
                  </div>
                </div>
              </div>
            </main>
          )}

          {/* Quick Add Backdrop */}
          {isQuickAddOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsQuickAddOpen(false)}
            />
          )}

          {/* Floating Action Buttons */}
          <div className="fixed bottom-4 right-4 flex flex-col items-center gap-2 z-50">
            {/* Todo Button */}
            {isQuickAddOpen && (
              <Dialog open={activeDialog === 'todo'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all h-9 w-9 p-0 flex items-center justify-center animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDialog('todo');
                      }}
                    >
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" sideOffset={8} className="bg-popover border-border text-foreground">
                    Add Task
                  </TooltipContent>
                </Tooltip>
                <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Add New Task</DialogTitle>
                  </DialogHeader>
                  <AddTodoForm onSubmit={handleAddTodo} onCancel={() => setActiveDialog(null)} />
                </DialogContent>
              </Dialog>
            )}

            {/* Event Button */}
            {isQuickAddOpen && (
              <Dialog open={activeDialog === 'event'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all h-9 w-9 p-0 flex items-center justify-center animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDialog('event');
                      }}
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" sideOffset={8} className="bg-popover border-border text-foreground">
                    Add Event
                  </TooltipContent>
                </Tooltip>
                <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Add New Event</DialogTitle>
                  </DialogHeader>
                  <AddEventForm onSubmit={handleAddEvent} onCancel={() => setActiveDialog(null)} />
                </DialogContent>
              </Dialog>
            )}

            {/* Goal Button */}
            {isQuickAddOpen && (
              <Dialog open={activeDialog === 'goal'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all h-9 w-9 p-0 flex items-center justify-center animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDialog('goal');
                      }}
                    >
                      <Target className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" sideOffset={8} className="bg-popover border-border text-foreground">
                    Add Goal
                  </TooltipContent>
                </Tooltip>
                <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Add New Goal</DialogTitle>
                  </DialogHeader>
                  <AddGoalForm onSubmit={handleAddGoal} onCancel={() => setActiveDialog(null)} />
                </DialogContent>
              </Dialog>
            )}

            {/* Note Button */}
            {isQuickAddOpen && (
              <Dialog open={activeDialog === 'note'} onOpenChange={(open) => !open && setActiveDialog(null)}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all h-9 w-9 p-0 flex items-center justify-center animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDialog('note');
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" sideOffset={8} className="bg-popover border-border text-foreground">
                    Add Note
                  </TooltipContent>
                </Tooltip>
                <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Add New Note</DialogTitle>
                  </DialogHeader>
                  <AddNoteForm onSubmit={handleAddNote} onCancel={() => setActiveDialog(null)} />
                </DialogContent>
              </Dialog>
            )}

            {/* Main Add Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="rounded-full bg-white text-black hover:bg-white/90 transition-all h-12 w-12 p-0 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleQuickAdd();
                  }}
                >
                  <Plus className={`h-5 w-5 transition-transform duration-200 ${isQuickAddOpen ? 'rotate-45' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8} className="bg-popover border-border text-foreground">
                {isQuickAddOpen ? 'Close' : 'Quick Add'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
