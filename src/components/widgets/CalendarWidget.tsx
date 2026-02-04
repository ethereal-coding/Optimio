import React, { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppState, actions } from '@/hooks/useAppState';
import type { Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Edit2,
  Trash2
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddEventForm } from '@/components/forms/AddEventForm';

interface CalendarWidgetProps {
  className?: string;
}

export const CalendarWidget = React.memo(function CalendarWidget({ className }: CalendarWidgetProps) {
  const { state, dispatch } = useAppState();
  const { calendars, selectedDate } = state;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const allEvents = calendars.flatMap(cal => cal.events);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    dispatch(actions.setSelectedDate(date));
  };

  const handleAddEvent = (event: Event) => {
    dispatch(actions.addEvent('1', event));
    setShowAddEvent(false);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleDeleteEvent = (eventId: string) => {
    dispatch(actions.deleteEvent('1', eventId));
    setSelectedEvent(null);
  };

  const handleUpdateEvent = (event: Event) => {
    dispatch(actions.updateEvent('1', event));
    setEditingEvent(null);
    setSelectedEvent(event);
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Get events for selected date
  const selectedDateEvents = allEvents.filter(event => 
    isSameDay(new Date(event.startTime), selectedDate)
  ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Virtual scrolling setup for event list
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: selectedDateEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // estimated row height (p-3 padding + content)
  });

  return (
    <Card className={cn("bg-card border-border rounded-lg w-full h-full flex flex-col", className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-sm font-medium text-foreground">Calendar</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2 truncate max-w-[100px]">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary" 
              onClick={handlePreviousMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary" 
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden min-w-0 flex flex-col">
        {/* Mini Calendar - Fixed */}
        <div className="space-y-2 min-w-0 flex-shrink-0">
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 min-w-0">
            {weekDays.map((weekDay, index) => (
              <div
                key={index}
                className="text-center text-[10px] text-muted-foreground py-1"
              >
                {weekDay}
              </div>
            ))}
          </div>

          {/* Calendar grid - responsive day buttons */}
          <div className="grid grid-cols-7 gap-1 min-w-0" role="grid">
            {days.map((date) => {
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              const dayEvents = allEvents.filter(e => isSameDay(new Date(e.startTime), date));
              const eventCount = dayEvents.length;
              
              const ariaLabel = isToday
                ? `Today, ${format(date, 'MMMM d, yyyy')}${eventCount > 0 ? `, ${eventCount} event${eventCount !== 1 ? 's' : ''}` : ''}`
                : `${format(date, 'MMMM d, yyyy')}${eventCount > 0 ? `, ${eventCount} event${eventCount !== 1 ? 's' : ''}` : ''}`;

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDateClick(date)}
                  aria-label={ariaLabel}
                  aria-selected={isSelected}
                  role="gridcell"
                  className={cn(
                    'group relative aspect-square w-full max-h-7 mx-auto rounded-md flex items-center justify-center text-xs transition-colors',
                    !isCurrentMonth && 'text-muted-foreground',
                    isCurrentMonth && !isSelected && 'text-foreground hover:bg-secondary/30',
                    isToday && !isSelected && 'bg-muted text-foreground font-medium',
                    isSelected && 'bg-white/75 border border-white text-neutral-950 font-medium',
                    !isSelected && !isToday && 'hover:text-foreground'
                  )}
                >
                  {format(date, 'd')}
                  {dayEvents.length > 0 && !isSelected && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 group-hover:opacity-0 transition-opacity" aria-hidden="true">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className="h-1 w-2 rounded-full border"
                          style={{ 
                            backgroundColor: event.color ? `${event.color}80` : '#66666680',
                            borderColor: event.color || '#666'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events - Scrollable */}
        <div className="border-t border-border pt-3 min-w-0 flex-1 overflow-hidden mt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs text-foreground/50">
              {format(selectedDate, 'EEE, MMM d')}
            </h4>
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => setShowAddEvent(true)}
                aria-label="Add new event"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Add New Event</DialogTitle>
                </DialogHeader>
                <AddEventForm onSubmit={handleAddEvent} onCancel={() => setShowAddEvent(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-full pr-3" ref={parentRef}>
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-xs">No events for this day</p>
              </div>
            ) : (
              <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const event = selectedDateEvents[virtualItem.index];
                  return (
                    <div
                      key={event.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className="pr-1"
                    >
                      <div
                        className="group p-3 rounded-md bg-card border border-border hover:border-border-strong hover:bg-secondary/30 transition-colors cursor-pointer flex flex-col gap-2 min-w-0 max-w-full"
                        onClick={() => handleEventClick(event)}
                      >
                        {/* Top row: Color indicator + Title */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: event.color || '#666' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground font-medium truncate">{event.title}</p>
                          </div>
                        </div>
                        
                        {/* Bottom row: Time */}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent && !editingEvent} onOpenChange={(open) => {
        if (!open) {
          setSelectedEvent(null);
          setEditingEvent(null);
        }
      }}>
        <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pt-4">
                  <DialogTitle className="text-lg text-foreground flex-1 min-w-0">{selectedEvent.title}</DialogTitle>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={() => setEditingEvent(selectedEvent)}
                      aria-label={`Edit event: ${selectedEvent.title}`}
                      aria-describedby={selectedEvent.description ? `event-desc-${selectedEvent.id}` : undefined}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      aria-label={`Delete event: ${selectedEvent.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="border-t border-border -mt-4"></div>

              <div className="space-y-4 pt-3">
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-2 text-foreground/60 mb-2">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      {format(selectedEvent.startTime, 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="text-foreground/60 text-sm">
                    {format(selectedEvent.startTime, 'h:mm a')} - {format(selectedEvent.endTime, 'h:mm a')}
                  </div>
                </div>

                {selectedEvent.location && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Location</label>
                    <div className="flex items-center gap-2 text-foreground/70">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <p className="text-sm">{selectedEvent.location}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Description</label>
                    <p id={`event-desc-${selectedEvent.id}`} className="text-sm text-foreground/70 leading-relaxed">{selectedEvent.description}</p>
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
        <DialogContent className="bg-card border-border rounded-lg max-w-3xl">
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
    </Card>
  );
});
