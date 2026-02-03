import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Clock, MapPin, X } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { GOOGLE_CALENDAR_COLORS } from '@/lib/google-calendar';

interface AddEventFormProps {
  onSubmit: (event: any) => void;
  onCancel: () => void;
  initialDate?: Date | null;
  initialEvent?: any;
}

// Use Google Calendar colors for consistency
const colors = Object.values(GOOGLE_CALENDAR_COLORS).map(({ hex, name }) => ({
  value: hex,
  label: name,
}));

export function AddEventForm({ onSubmit, onCancel, initialDate, initialEvent }: AddEventFormProps) {
  const getInitialDate = () => {
    if (initialEvent?.startTime) {
      return typeof initialEvent.startTime === 'string' ? new Date(initialEvent.startTime) : initialEvent.startTime;
    }
    return initialDate || new Date();
  };

  const getInitialTime = (time: any, defaultTime: string) => {
    if (!time) return defaultTime;
    const date = typeof time === 'string' ? new Date(time) : time;
    return format(date, 'HH:mm');
  };

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [location, setLocation] = useState(initialEvent?.location || '');
  const [date, setDate] = useState<Date>(getInitialDate());
  const [startTime, setStartTime] = useState(getInitialTime(initialEvent?.startTime, '09:00'));
  const [endTime, setEndTime] = useState(getInitialTime(initialEvent?.endTime, '10:00'));
  const [color, setColor] = useState(initialEvent?.color || '#5484ed'); // Default to Blueberry
  const [isAllDay, setIsAllDay] = useState(initialEvent?.isAllDay || false);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>(
    initialEvent?.recurrence || 'none'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startDateTime = isAllDay 
      ? new Date(date.setHours(0, 0, 0, 0))
      : setMinutes(setHours(new Date(date), startHour), startMinute);
    
    const endDateTime = isAllDay
      ? new Date(date.setHours(23, 59, 59, 999))
      : setMinutes(setHours(new Date(date), endHour), endMinute);

    onSubmit({
      id: initialEvent?.id || uuidv4(),
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startTime: startDateTime,
      endTime: endDateTime,
      color,
      isAllDay,
      recurrence,
      // Preserve Google Calendar sync fields when editing
      googleEventId: initialEvent?.googleEventId,
      sourceCalendarId: initialEvent?.sourceCalendarId,
      syncedFromGoogle: initialEvent?.syncedFromGoogle,
      calendarId: initialEvent?.calendarId || '1'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-muted-foreground">Event Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the event?"
          autoFocus
          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-muted-foreground">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details..."
          rows={2}
          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location" className="text-muted-foreground">
          <MapPin className="h-4 w-4 inline mr-1" />
          Location
        </Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Add location..."
          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal bg-input border-border text-foreground hover:bg-secondary hover:text-foreground h-10"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {date ? format(date, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {!isAllDay && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-muted-foreground">
              <Clock className="h-4 w-4 inline mr-1" />
              Start Time
            </Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-input border-border text-foreground focus:border-border focus:ring-0 h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime" className="text-muted-foreground">
              <Clock className="h-4 w-4 inline mr-1" />
              End Time
            </Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-input border-border text-foreground focus:border-border focus:ring-0 h-10"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-muted-foreground">Color</Label>
        <div className="flex gap-2 flex-wrap">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`h-7 w-7 rounded-md transition-all ${
                color === c.value ? 'ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110' : ''
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="allDay"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.target.checked)}
          className="rounded border-border bg-input text-foreground focus:ring-0"
        />
        <Label htmlFor="allDay" className="text-sm text-muted-foreground cursor-pointer">
          All day event
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recurrence" className="text-muted-foreground">Repeat</Label>
        <select
          id="recurrence"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as any)}
          className="w-full h-10 px-3 bg-input border border-border text-foreground rounded-md focus:border-border focus:ring-0"
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-muted-foreground hover:text-foreground hover:bg-secondary h-10">
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!title.trim()}
          className="bg-white/75 border border-white text-neutral-950 hover:bg-white hover:border-white h-10"
        >
          {initialEvent ? 'Save Changes' : 'Add Event'}
        </Button>
      </div>
    </form>
  );
}
