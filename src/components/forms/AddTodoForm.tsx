import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { Todo } from '@/types';

interface AddTodoFormProps {
  onSubmit: (todo: Todo) => void;
  onCancel: () => void;
  initialTodo?: Partial<Todo>;
}

export function AddTodoForm({ onSubmit, onCancel, initialTodo }: AddTodoFormProps) {
  const [title, setTitle] = useState(initialTodo?.title || '');
  const [description, setDescription] = useState(initialTodo?.description || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(initialTodo?.priority || 'medium');
  const [category, setCategory] = useState(initialTodo?.category || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialTodo?.dueDate ? new Date(initialTodo.dueDate) : new Date()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      id: initialTodo?.id || uuidv4(),
      title: title.trim(),
      description: description.trim() || undefined,
      completed: initialTodo?.completed || false,
      priority,
      category: category.trim() || undefined,
      dueDate,
      createdAt: initialTodo?.createdAt || new Date(),
      completedAt: initialTodo?.completedAt,
      subtasks: initialTodo?.subtasks || []
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-muted-foreground">Task Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Priority</Label>
          <Select value={priority} onValueChange={(v: 'low' | 'medium' | 'high') => setPriority(v)}>
            <SelectTrigger className="bg-input border-border text-foreground h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="low" className="text-foreground/70 hover:text-foreground hover:bg-secondary">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500/50 border border-blue-500" />
                  Low
                </span>
              </SelectItem>
              <SelectItem value="medium" className="text-foreground/70 hover:text-foreground hover:bg-secondary">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500/50 border border-yellow-500" />
                  Medium
                </span>
              </SelectItem>
              <SelectItem value="high" className="text-foreground/70 hover:text-foreground hover:bg-secondary">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500/50 border border-red-500" />
                  High
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category" className="text-muted-foreground">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Work, Personal"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal bg-input border-border text-foreground hover:bg-secondary hover:text-foreground h-10"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
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
          {initialTodo ? 'Save Changes' : 'Add Task'}
        </Button>
      </div>
    </form>
  );
}
