import { useState } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import type { Todo, CalendarEvent } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar,
  CheckSquare,
  Clock,
  MapPin,
  ChevronRight,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddEventForm } from './AddEventForm';
import { AddTodoForm } from './AddTodoForm';
import { updateEventWithSync, deleteEventWithSync } from '@/lib/calendar-sync';
import { updateTodoWithSync, deleteTodoWithSync, toggleTodoWithSync } from '@/lib/todo-sync';

interface TodayOverviewProps {
  className?: string;
}

export function TodayOverview({ className }: TodayOverviewProps) {
  const { state, dispatch, getTodayEvents, getTodayTodos } = useAppState();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const todayEvents = getTodayEvents();
  const todayTodos = getTodayTodos();

  const handleToggleTodo = async (todoId: string) => {
    await toggleTodoWithSync(todoId, dispatch, actions);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const event = todayEvents.find(e => e.id === eventId);
    await deleteEventWithSync('1', eventId, event, dispatch, actions);
    setSelectedEvent(null);
  };

  const handleUpdateEvent = async (event: CalendarEvent) => {
    await updateEventWithSync('1', event, dispatch, actions);
    setEditingEvent(null);
    setSelectedEvent(event);
  };

  const handleUpdateTodo = async (todo: Todo) => {
    await updateTodoWithSync(todo, dispatch, actions);
    setEditingTodo(null);
  };

  const handleDeleteTodo = async (todoId: string) => {
    await deleteTodoWithSync(todoId, dispatch, actions);
  };

  return (
    <Card className={cn("bg-card border-border rounded-lg w-full h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {format(state.selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">Overview</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-secondary h-8"
            onClick={() => {
              dispatch(actions.setCalendarView('day'));
              dispatch(actions.setView('calendar'));
            }}
          >
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden min-w-0 flex flex-col gap-4">
        {/* Today's Schedule */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">Schedule</h4>
            <span className="text-xs text-muted-foreground ml-auto">{todayEvents.length} events</span>
          </div>
          
          {todayEvents.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">No events scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-[180px] pr-1">
              {todayEvents.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="group p-3 rounded-md bg-card border border-border hover:border-border-strong hover:bg-secondary/30 transition-all cursor-pointer flex flex-col gap-1.5"
                  onClick={() => handleEventClick(event)}
                >
                  {/* Top row: Color indicator + Title */}
                  <div className="flex items-center gap-2">
                    {/* Vertical glassy color line */}
                    <div
                      className="h-4 w-1 rounded-full flex-shrink-0 border"
                      style={{ 
                        backgroundColor: event.color ? `${event.color}80` : '#66666680',
                        borderColor: event.color || '#666'
                      }}
                    />
                    <p className="text-sm text-foreground font-medium truncate">{event.title}</p>
                  </div>
                  
                  {/* Bottom row: Time and location */}
                  <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {todayEvents.length > 4 && (
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground hover:bg-secondary">
                  + {todayEvents.length - 4} more events
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Today's Tasks */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">Tasks</h4>
            <span className="text-xs text-muted-foreground ml-auto">
              {todayTodos.filter(t => t.completed).length}/{todayTodos.length} completed
            </span>
          </div>
          
          {todayTodos.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">No tasks due today</p>
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-[180px] pr-1">
              {todayTodos.slice(0, 5).map((todo) => (
                <div
                  key={todo.id}
                  className="group p-3 rounded-md bg-card border border-border hover:border-border-strong hover:bg-secondary/30 transition-all cursor-pointer flex flex-col gap-1.5"
                  onClick={() => setSelectedTodo(todo)}
                >
                  {/* Top row: Checkbox + Priority dot + Title */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleTodo(todo.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="border-muted-foreground/40"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'h-2 w-2 rounded-full flex-shrink-0 border',
                          todo.priority === 'high' && 'bg-red-500/50 text-red-400 border border-red-500',
                          todo.priority === 'medium' && 'bg-yellow-500/50 text-yellow-200 border border-yellow-500',
                          todo.priority === 'low' && 'bg-blue-500/50 text-blue-400 border border-blue-500'
                        )} />
                        <p className={cn(
                          'text-sm text-foreground truncate',
                          todo.completed && 'line-through text-muted-foreground'
                        )}>
                          {todo.title}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom row: Due date on LEFT; Priority + Category on RIGHT */}
                  <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50 mt-auto">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Today
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] text-white/90 capitalize',
                        todo.priority === 'high' && 'bg-red-500/50 text-red-400 border border-red-500',
                        todo.priority === 'medium' && 'bg-yellow-500/50 text-yellow-200 border border-yellow-500',
                        todo.priority === 'low' && 'bg-blue-500/50 text-blue-400 border border-blue-500'
                      )}>
                        {todo.priority}
                      </span>
                      {todo.category && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground/50 text-[10px]">
                          {todo.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {todayTodos.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground hover:bg-secondary">
                  + {todayTodos.length - 5} more tasks
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent && !editingEvent} onOpenChange={(open) => {
        if (!open) {
          setSelectedEvent(null);
          setEditingEvent(null);
        }
      }}>
        <DialogContent className="bg-card border-border max-w-3xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pt-4">
                  <DialogTitle className="text-lg text-foreground flex-1">{selectedEvent.title}</DialogTitle>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={() => setEditingEvent(selectedEvent)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="border-t border-border -mt-4"></div>

              <div className="space-y-4 pt-3">
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {format(selectedEvent.startTime, 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {format(selectedEvent.startTime, 'h:mm a')} - {format(selectedEvent.endTime, 'h:mm a')}
                  </div>
                </div>

                {selectedEvent.location && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Location</label>
                    <div className="flex items-center gap-2 text-foreground/70">
                      <MapPin className="h-4 w-4" />
                      <p className="text-sm">{selectedEvent.location}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Description</label>
                    <p className="text-sm text-foreground/70 leading-relaxed">{selectedEvent.description}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => {
        if (!open) {
          setEditingEvent(null);
        }
      }}>
        <DialogContent className="bg-card border-border max-w-3xl">
          {editingEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">Edit Event</DialogTitle>
              </DialogHeader>
              <AddEventForm
                initialEvent={editingEvent}
                onSubmit={handleUpdateEvent}
                onCancel={() => setEditingEvent(null)}
              />
            </>
          )}
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
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pt-4">
                  <DialogTitle className="text-lg text-foreground flex-1">{selectedTodo.title}</DialogTitle>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={() => setEditingTodo(selectedTodo)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => {
                        handleDeleteTodo(selectedTodo.id);
                        setSelectedTodo(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="border-t border-border -mt-4"></div>

              <div className="space-y-4 pt-3">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedTodo.completed}
                    onCheckedChange={() => handleToggleTodo(selectedTodo.id)}
                    className="border-muted-foreground/40"
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedTodo.completed ? 'Completed' : 'Not completed'}
                  </span>
                </div>

                {/* Priority & Due Date */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Priority:</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      selectedTodo.priority === 'high' && 'bg-red-500/50 text-red-400 border border-red-500',
                      selectedTodo.priority === 'medium' && 'bg-yellow-500/50 text-yellow-200 border border-yellow-500',
                      selectedTodo.priority === 'low' && 'bg-blue-500/50 text-blue-400 border border-blue-500'
                    )}>
                      {selectedTodo.priority}
                    </span>
                  </div>
                  {selectedTodo.dueDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due:</span>
                      <span className={cn(
                        'text-muted-foreground',
                        isPast(selectedTodo.dueDate) && !isToday(selectedTodo.dueDate) && !selectedTodo.completed && 'text-red-400'
                      )}>
                        {format(selectedTodo.dueDate, 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Category */}
                {selectedTodo.category && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Category: </span>
                    <span className="text-muted-foreground">{selectedTodo.category}</span>
                  </div>
                )}

                {/* Description */}
                {selectedTodo.description && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Description</label>
                    <p className="text-sm text-foreground/70 leading-relaxed">{selectedTodo.description}</p>
                  </div>
                )}
              </div>
            </>
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
    </Card>
  );
}
