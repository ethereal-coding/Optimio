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
import { CalendarIcon, X, Target, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface AddGoalFormProps {
  onSubmit: (goal: any) => void;
  onCancel: () => void;
  initialGoal?: any;
}

const colors = [
  { value: 'rgb(139, 92, 246)', label: 'Purple' },
  { value: 'rgb(59, 130, 246)', label: 'Blue' },
  { value: 'rgb(34, 197, 94)', label: 'Green' },
  { value: 'rgb(245, 158, 11)', label: 'Orange' },
  { value: 'rgb(239, 68, 68)', label: 'Red' },
  { value: 'rgb(236, 72, 153)', label: 'Pink' },
];

export function AddGoalForm({ onSubmit, onCancel, initialGoal }: AddGoalFormProps) {
  const [title, setTitle] = useState(initialGoal?.title || '');
  const [description, setDescription] = useState(initialGoal?.description || '');
  const [targetValue, setTargetValue] = useState(initialGoal?.targetValue?.toString() || '');
  const [currentValue, setCurrentValue] = useState(initialGoal?.currentValue?.toString() || '0');
  const [unit, setUnit] = useState(initialGoal?.unit || '');
  const [deadline, setDeadline] = useState<Date | undefined>(initialGoal?.deadline ? new Date(initialGoal.deadline) : undefined);
  const [color, setColor] = useState(initialGoal?.color || 'rgb(139, 92, 246)');
  const [category, setCategory] = useState(initialGoal?.category || '');
  const [milestones, setMilestones] = useState<{ id: string; title: string; targetValue: string }[]>(
    initialGoal?.milestones?.map((m: any) => ({
      id: m.id,
      title: m.title,
      targetValue: m.targetValue?.toString() || ''
    })) || []
  );

  const addMilestone = () => {
    setMilestones([...milestones, { id: uuidv4(), title: '', targetValue: '' }]);
  };

  const updateMilestone = (id: string, field: 'title' | 'targetValue', value: string) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetValue.trim()) return;

    const target = parseFloat(targetValue);
    const current = parseFloat(currentValue) || 0;

    onSubmit({
      id: initialGoal?.id || uuidv4(),
      title: title.trim(),
      description: description.trim() || undefined,
      targetValue: target,
      currentValue: current,
      unit: unit.trim() || undefined,
      deadline,
      color,
      category: category.trim() || undefined,
      milestones: milestones
        .filter(m => m.title.trim())
        .map(m => {
          const existingMilestone = initialGoal?.milestones?.find((em: any) => em.id === m.id);
          return {
            id: m.id,
            title: m.title.trim(),
            targetValue: parseFloat(m.targetValue) || 0,
            isCompleted: existingMilestone?.isCompleted || false,
            completedAt: existingMilestone?.completedAt
          };
        }),
      createdAt: initialGoal?.createdAt || new Date()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-muted-foreground">
          <Target className="h-4 w-4 inline mr-1" />
          Goal Title *
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you want to achieve?"
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
          placeholder="Describe your goal..."
          rows={2}
          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="targetValue" className="text-muted-foreground">Target Value *</Label>
          <Input
            id="targetValue"
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="e.g., 100"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit" className="text-muted-foreground">Unit (optional)</Label>
          <Input
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g., pages, hours, $"
            className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currentValue" className="text-muted-foreground">Current Progress</Label>
        <Input
          id="currentValue"
          type="number"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder="0"
          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">Deadline (optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal bg-input border-border text-foreground hover:bg-accent hover:text-foreground h-10"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {deadline ? format(deadline, 'PPP') : 'Pick a deadline'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border">
            <Calendar
              mode="single"
              selected={deadline}
              onSelect={setDeadline}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className="text-muted-foreground">Category</Label>
        <Input
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g., Health, Career, Learning"
          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">Color</Label>
        <div className="flex gap-2 flex-wrap p-1">
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

      {/* Milestones */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground">Milestones</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addMilestone} className="text-muted-foreground hover:text-foreground hover:bg-accent h-8">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="space-y-3">
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="flex gap-2 items-start">
              <div className="flex items-center justify-center h-10 w-8 text-muted-foreground text-sm font-medium flex-shrink-0">
                {index + 1}.
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  value={milestone.title}
                  onChange={(e) => updateMilestone(milestone.id, 'title', e.target.value)}
                  placeholder="Milestone description (e.g., Complete 25% of goal)"
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
                />
                <div className="flex gap-2 items-center">
                  <Label className="text-muted-foreground text-xs whitespace-nowrap">Target value:</Label>
                  <Input
                    type="number"
                    value={milestone.targetValue}
                    onChange={(e) => updateMilestone(milestone.id, 'targetValue', e.target.value)}
                    placeholder={`e.g., ${Math.round((index + 1) * (parseFloat(targetValue) || 100) / (milestones.length + 1))}`}
                    className="w-32 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-8 text-sm"
                  />
                  <span className="text-muted-foreground text-sm">{unit || 'units'}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMilestone(milestone.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {milestones.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No milestones yet. Click "Add" to create checkpoints for your goal.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-card pb-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-muted-foreground hover:text-foreground hover:bg-accent h-10">
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || !targetValue.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10"
        >
          {initialGoal ? 'Save Changes' : 'Add Goal'}
        </Button>
      </div>
    </form>
  );
}
