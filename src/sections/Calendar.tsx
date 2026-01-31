import { useState, useRef, useEffect } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Button } from '@/components/ui/button';
import { debug } from '@/lib/debug';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Trash2,
  Pen,
  Repeat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { AddEventForm } from '@/components/AddEventForm';
import { addEventWithSync, updateEventWithSync, deleteEventWithSync } from '@/lib/calendar-sync';

export function Calendar() {
  const { state, dispatch } = useAppState();
  const { calendars, calendarView } = state;
  const events = calendars[0]?.events || [];

  // Debug: Log event count
  debug.log('📊 Calendar component - Total events in state:', events.length);
  debug.log('📊 Calendar ID:', calendars[0]?.id);
  debug.log('📊 First few events:', events.slice(0, 3));

  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Auto-open event from search
  useEffect(() => {
    if (state.selectedItemToOpen?.type === 'event') {
      const event = state.calendars.flatMap(cal => cal.events).find(e => e.id === state.selectedItemToOpen!.id);
      if (event) {
        setSelectedEvent(event);
        dispatch(actions.setSelectedItemToOpen(null));
      }
    }
  }, [state.selectedItemToOpen, state.calendars, dispatch]);

  // Filter events based on search
  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddEvent = async (event: any) => {
    await addEventWithSync('1', event, dispatch, actions);
    setShowAddEvent(false);
    setSelectedDate(null);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setShowAddEvent(true);
  };

  const handleUpdateEvent = async (event: any) => {
    await updateEventWithSync('1', event, dispatch, actions);
    setEditingEvent(null);
    setSelectedEvent(event);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    await deleteEventWithSync('1', eventId, event, dispatch, actions);
    setSelectedEvent(null);
  };

  const nextPeriod = () => {
    if (calendarView === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const prevPeriod = () => {
    if (calendarView === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDay = (day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);

    return filteredEvents.filter(event => {
      const eventStart = typeof event.startTime === 'string' ? parseISO(event.startTime) : event.startTime;
      const eventEnd = typeof event.endTime === 'string' ? parseISO(event.endTime) : event.endTime;

      return isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
             isWithinInterval(dayEnd, { start: eventStart, end: eventEnd }) ||
             isWithinInterval(eventStart, { start: dayStart, end: dayEnd });
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
              <p className="text-xs text-muted-foreground">{filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddEvent(true)}
            className="bg-white text-black hover:bg-white/90 h-10 px-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:bg-accent focus:border-border"
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={prevPeriod}
              className="h-9 w-9 bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={goToToday}
              className="h-9 px-4 bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextPeriod}
              className="h-9 w-9 bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Period Display */}
          <div className="text-foreground font-medium min-w-[180px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch(actions.setCalendarView('month'))}
              className={cn(
                "h-8 text-xs transition-colors",
                calendarView === 'month'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch(actions.setCalendarView('week'))}
              className={cn(
                "h-8 text-xs transition-colors",
                calendarView === 'week'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch(actions.setCalendarView('day'))}
              className={cn(
                "h-8 text-xs transition-colors",
                calendarView === 'day'
                  ? 'bg-white text-black hover:bg-white hover:text-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              Day
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {calendarView === 'month' && <MonthView currentDate={currentDate} events={filteredEvents} onEventClick={setSelectedEvent} onDayClick={handleDayClick} getEventsForDay={getEventsForDay} />}
        {calendarView === 'week' && <WeekView currentDate={currentDate} events={filteredEvents} onEventClick={setSelectedEvent} onDayClick={handleDayClick} getEventsForDay={getEventsForDay} />}
        {calendarView === 'day' && <DayView currentDate={currentDate} events={filteredEvents} onEventClick={setSelectedEvent} onDayClick={handleDayClick} getEventsForDay={getEventsForDay} />}
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAddEvent} onOpenChange={(open) => {
        setShowAddEvent(open);
        if (!open) setSelectedDate(null);
      }}>
        <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Event</DialogTitle>
          </DialogHeader>
          <AddEventForm
            onSubmit={handleAddEvent}
            onCancel={() => {
              setShowAddEvent(false);
              setSelectedDate(null);
            }}
            initialDate={selectedDate}
          />
        </DialogContent>
      </Dialog>

      {/* View/Edit Event Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => {
        if (!open) {
          setSelectedEvent(null);
          setEditingEvent(null);
        }
      }}>
        <DialogContent className="bg-card border-border max-w-3xl" showCloseButton={false}>
          {selectedEvent && !editingEvent && (
            <ViewEventContent
              event={selectedEvent}
              onEdit={() => setEditingEvent(selectedEvent)}
              onDelete={() => handleDeleteEvent(selectedEvent.id)}
              onClose={() => {
                setSelectedEvent(null);
                setEditingEvent(null);
              }}
            />
          )}
          {editingEvent && (
            <EditEventContent
              event={editingEvent}
              onSave={handleUpdateEvent}
              onCancel={() => setEditingEvent(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Month View Component
interface MonthViewProps {
  currentDate: Date;
  events: any[];
  onEventClick: (event: any) => void;
  onDayClick: (day: Date) => void;
  getEventsForDay: (day: Date) => any[];
}

function MonthView({ currentDate, onEventClick, onDayClick, getEventsForDay }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const formattedDate = format(day, 'd');
      const cloneDay = day;
      const dayEvents = getEventsForDay(day);

      days.push(
        <div
          key={day.toString()}
          onClick={() => onDayClick(cloneDay)}
          className={cn(
            "min-h-[120px] border-r border-b border-border p-2 cursor-pointer hover:bg-accent transition-colors",
            !isSameMonth(day, monthStart) && "bg-background/50",
            isToday(day) && "bg-white/[0.02]"
          )}
        >
          <div className={cn(
            "text-sm font-medium mb-2",
            !isSameMonth(day, monthStart) ? "text-muted-foreground" : "text-foreground/70",
            isToday(day) && "text-foreground"
          )}>
            {formattedDate}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate"
                style={{ backgroundColor: event.color + '20', color: event.color }}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-muted-foreground px-2">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={day.toString()} className="grid grid-cols-7">
        {days}
      </div>
    );
    days = [];
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 border-b border-border">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-3 border-r border-border last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1">{rows}</div>
    </div>
  );
}

// Week View Component
function WeekView({ currentDate, onEventClick, onDayClick, getEventsForDay }: MonthViewProps) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="h-full flex flex-col">
      {/* Week Header */}
      <div className="grid grid-cols-7 border-b border-border bg-background sticky top-0 z-10">
        {days.map((day) => (
          <div
            key={day.toString()}
            onClick={() => onDayClick(day)}
            className={cn(
              "text-center py-4 border-r border-border last:border-r-0 cursor-pointer hover:bg-accent transition-colors",
              isToday(day) && "bg-white/[0.03]"
            )}
          >
            <div className="text-xs text-muted-foreground mb-1">{format(day, 'EEE')}</div>
            <div className={cn(
              "text-xl font-semibold",
              isToday(day) ? "text-foreground" : "text-foreground/70"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Week Body */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="grid grid-cols-7 min-h-full">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day).sort((a, b) => {
              const aStart = typeof a.startTime === 'string' ? parseISO(a.startTime) : a.startTime;
              const bStart = typeof b.startTime === 'string' ? parseISO(b.startTime) : b.startTime;
              return aStart.getTime() - bStart.getTime();
            });

            return (
              <div
                key={day.toString()}
                className={cn(
                  "border-r border-border last:border-r-0 p-3 min-h-[400px]",
                  isToday(day) && "bg-white/[0.01]"
                )}
              >
                {dayEvents.length === 0 ? (
                  <div
                    onClick={() => onDayClick(day)}
                    className="h-full flex items-center justify-center cursor-pointer hover:bg-accent rounded-lg transition-colors"
                  >
                    <div className="text-center">
                      <Plus className="h-6 w-6 text-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Add event</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayEvents.map((event) => {
                      const eventStart = typeof event.startTime === 'string' ? parseISO(event.startTime) : event.startTime;
                      const eventEnd = typeof event.endTime === 'string' ? parseISO(event.endTime) : event.endTime;

                      return (
                        <div
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className="p-3 rounded-lg cursor-pointer hover:opacity-90 transition-all"
                          style={{
                            backgroundColor: event.color + '15',
                            borderLeft: `4px solid ${event.color}`
                          }}
                        >
                          <div className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                            {event.title}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-foreground/50">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Day View Component
function DayView({ currentDate, onEventClick, onDayClick, getEventsForDay }: MonthViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const HOUR_HEIGHT = 60; // Reduced from 80px for more compact view

  const dayEvents = getEventsForDay(currentDate).sort((a, b) => {
    const aStart = typeof a.startTime === 'string' ? parseISO(a.startTime) : a.startTime;
    const bStart = typeof b.startTime === 'string' ? parseISO(b.startTime) : b.startTime;
    return aStart.getTime() - bStart.getTime();
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleTimeSlotClick = (hour: number) => {
    const clickedTime = new Date(currentDate);
    clickedTime.setHours(hour, 0, 0, 0);
    onDayClick(clickedTime);
  };

  // Auto-scroll to 7 AM or first event
  useEffect(() => {
    if (!containerRef.current) return;
    
    const scrollHour = dayEvents.length > 0 
      ? (typeof dayEvents[0].startTime === 'string' ? parseISO(dayEvents[0].startTime) : dayEvents[0].startTime).getHours()
      : 7;
    
    containerRef.current.scrollTo({
      top: scrollHour * HOUR_HEIGHT,
      behavior: 'smooth'
    });
  }, [dayEvents, currentDate]);

  // Group overlapping events
  const getEventGroups = () => {
    const groups: { event: any; column: number; totalColumns: number }[][] = [];
    
    dayEvents.forEach((event) => {
      const eventStart = typeof event.startTime === 'string' ? parseISO(event.startTime) : event.startTime;
      const eventEnd = typeof event.endTime === 'string' ? parseISO(event.endTime) : event.endTime;
      
      // Find a group this event overlaps with
      let foundGroup = false;
      for (const group of groups) {
        const overlaps = group.some(({ event: e }) => {
          const eStart = typeof e.startTime === 'string' ? parseISO(e.startTime) : e.startTime;
          const eEnd = typeof e.endTime === 'string' ? parseISO(e.endTime) : e.endTime;
          return eventStart < eEnd && eventEnd > eStart;
        });
        
        if (overlaps) {
          // Find available column
          const usedColumns = new Set(group.map(g => g.column));
          let column = 0;
          while (usedColumns.has(column)) column++;
          
          group.push({ event, column, totalColumns: 0 });
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        groups.push([{ event, column: 0, totalColumns: 1 }]);
      }
    });
    
    // Update totalColumns for each event
    groups.forEach(group => {
      const maxColumn = Math.max(...group.map(g => g.column));
      group.forEach(g => g.totalColumns = maxColumn + 1);
    });
    
    return groups.flat();
  };

  const eventPositions = getEventGroups();

  return (
    <div ref={containerRef} className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-background">
      <div className="relative min-h-full">
        {/* Hour grid */}
        {hours.map((hour) => {
          const timeDate = new Date(currentDate);
          timeDate.setHours(hour, 0, 0, 0);
          const isCurrentHour = new Date().getHours() === hour && isToday(currentDate);

          return (
            <div 
              key={hour} 
              className="flex border-b border-border/30"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              {/* Time label */}
              <div className="w-14 flex-shrink-0 pr-2 text-right pt-1 sticky left-0 bg-background z-10">
                <span className={cn(
                  "text-[11px] font-medium",
                  isCurrentHour ? "text-primary font-semibold" : "text-muted-foreground"
                )}>
                  {format(timeDate, 'h a')}
                </span>
              </div>

              {/* Time slot - clickable */}
              <div
                className="flex-1 border-l border-border/50 pl-2 py-1 cursor-pointer hover:bg-accent/50 transition-colors relative group"
                onClick={() => handleTimeSlotClick(hour)}
              >
                {/* Current time indicator */}
                {isCurrentHour && (
                  <div className="absolute left-0 right-0 top-0 h-px bg-primary/30" />
                )}
              </div>
            </div>
          );
        })}

        {/* Events overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ left: '56px' }}>
          {eventPositions.map(({ event, column, totalColumns }) => {
            const eventStart = typeof event.startTime === 'string' ? parseISO(event.startTime) : event.startTime;
            const eventEnd = typeof event.endTime === 'string' ? parseISO(event.endTime) : event.endTime;
            
            const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
            const topOffset = startHour * HOUR_HEIGHT;
            
            const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
            const height = Math.max(durationHours * HOUR_HEIGHT - 2, 24);
            
            // Calculate width and left position for overlapping events
            const widthPercent = totalColumns > 1 ? 95 / totalColumns : 98;
            const leftPercent = column * widthPercent;

            return (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                className="absolute pointer-events-auto bg-card border border-border/80 rounded-md px-2 py-1 cursor-pointer hover:shadow-md hover:border-border transition-all overflow-hidden"
                style={{
                  top: `${topOffset}px`,
                  height: `${height}px`,
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  zIndex: 10
                }}
              >
                <div className="flex gap-1.5 h-full">
                  <div
                    className="w-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color || '#666' }}
                  />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="text-xs font-semibold text-foreground truncate leading-tight">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        {format(eventStart, 'h:mm')} - {format(eventEnd, 'h:mm')}
                      </span>
                    </div>
                    {event.location && height > 35 && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current time line */}
        {isToday(currentDate) && (
          <div 
            className="absolute left-14 right-0 border-t-2 border-primary z-20 pointer-events-none"
            style={{ 
              top: `${(new Date().getHours() + new Date().getMinutes() / 60) * HOUR_HEIGHT}px` 
            }}
          >
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

// View Event Content
interface ViewEventContentProps {
  event: any;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function ViewEventContent({ event, onEdit, onDelete }: ViewEventContentProps) {
  const eventStart = typeof event.startTime === 'string' ? parseISO(event.startTime) : event.startTime;
  const eventEnd = typeof event.endTime === 'string' ? parseISO(event.endTime) : event.endTime;

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between gap-4 pt-4">
          <DialogTitle className="text-xl text-foreground flex-1">{event.title}</DialogTitle>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={onEdit}
            >
              <Pen className="h-4 w-4" />
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
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: event.color }}
          />
          <div>
            <div className="text-sm text-muted-foreground">
              {format(eventStart, 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="text-sm text-foreground">
              {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
            </div>
          </div>
        </div>

        {event.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground/70">{event.location}</span>
          </div>
        )}

        {event.recurrence && event.recurrence !== 'none' && (
          <div className="flex items-center gap-2 text-sm">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground/70 capitalize">{event.recurrence}</span>
          </div>
        )}

        {event.description && (
          <div>
            <label className="text-sm text-muted-foreground block mb-2">Description</label>
            <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Edit Event Content
interface EditEventContentProps {
  event: any;
  onSave: (event: any) => void;
  onCancel: () => void;
}

function EditEventContent({ event, onSave, onCancel }: EditEventContentProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-foreground">Edit Event</DialogTitle>
      </DialogHeader>
      <AddEventForm
        onSubmit={onSave}
        onCancel={onCancel}
        initialEvent={event}
      />
    </>
  );
}
