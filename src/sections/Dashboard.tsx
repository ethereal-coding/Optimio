import { useState, lazy, Suspense } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import type { Todo, CalendarEvent, Goal, Note } from '@/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { TodayOverview } from '@/components/widgets/TodayOverview';
import { CalendarWidget } from '@/components/widgets/CalendarWidget';
import { TodoWidget } from '@/components/widgets/TodoWidget';
import { GoalsWidget } from '@/components/widgets/GoalsWidget';
import { NotesWidget } from '@/components/widgets/NotesWidget';
import { QuickStats } from '@/components/widgets/QuickStats';


// Lazy load sections for code splitting
const Notes = lazy(() => import('@/sections/Notes').then(m => ({ default: m.Notes })));
const Goals = lazy(() => import('@/sections/Goals').then(m => ({ default: m.Goals })));
const Todos = lazy(() => import('@/sections/Todos').then(m => ({ default: m.Todos })));
const Calendar = lazy(() => import('@/sections/Calendar').then(m => ({ default: m.Calendar })));
const Settings = lazy(() => import('@/sections/Settings').then(m => ({ default: m.Settings })));
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { Plus, Calendar as CalendarIcon, CheckSquare, Target, FileText } from 'lucide-react';
import { AddTodoForm } from '@/components/forms/AddTodoForm';
import { AddEventForm } from '@/components/forms/AddEventForm';
import { AddGoalForm } from '@/components/forms/AddGoalForm';
import { AddNoteForm } from '@/components/forms/AddNoteForm';
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

  const handleAddTodo = async (todo: Todo) => {
    await addTodoWithSync(todo, dispatch, actions);
    setActiveDialog(null);
  };

  const handleAddEvent = async (event: CalendarEvent) => {
    await addEventWithSync('1', event, dispatch, actions);
    setActiveDialog(null);
  };

  const handleAddGoal = async (goal: Goal) => {
    await addGoalWithSync(goal, dispatch, actions);
    setActiveDialog(null);
  };

  const handleAddNote = async (note: Note) => {
    await addNoteWithSync(note, dispatch, actions);
    setActiveDialog(null);
  };

  const toggleQuickAdd = () => {
    setIsQuickAddOpen(!isQuickAddOpen);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-full bg-background">
        {/* Sidebar - Fixed */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 ml-16 pt-14">
          <Header onSearchOpen={onSearchOpen} showDateSelector={state.view === 'dashboard'} />

          {/* Render different views based on state */}
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          }>
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
            <main className="flex-1 overflow-auto custom-scrollbar h-[calc(100vh-3.5rem)]">
              <div className="w-full min-h-0 flex flex-col gap-4 p-6">
                {/* Quick Stats Row */}
                <QuickStats />

                {/* Main Grid - All widgets 525px */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
                  {/* Today Overview - full width on mobile, 2 cols on xl */}
                  <div className="md:col-span-2 xl:col-span-2 h-[525px]">
                    <TodayOverview />
                  </div>
                  
                  {/* Tasks - full width mobile, 1 col xl */}
                  <div className="h-[525px]">
                    <TodoWidget />
                  </div>
                  
                  {/* Notes */}
                  <div className="h-[525px]">
                    <NotesWidget />
                  </div>
                  
                  {/* Goals */}
                  <div className="h-[525px]">
                    <GoalsWidget />
                  </div>
                  
                  {/* Calendar */}
                  <div className="h-[525px]">
                    <CalendarWidget />
                  </div>
                </div>
              </div>
            </main>
          )}
          </Suspense>

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
                  className="rounded-lg bg-white/85 border border-white text-neutral-950 hover:bg-white hover:border-white transition-all h-12 w-12 p-0 flex items-center justify-center"
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
