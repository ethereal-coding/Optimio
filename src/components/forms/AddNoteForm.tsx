import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, FileText, Plus, Tag } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { sanitizeText, sanitizeHtml } from '@/lib/sanitize';
import { GOOGLE_CALENDAR_COLORS } from '@/lib/google-calendar';
import type { Note } from '@/types';

interface AddNoteFormProps {
  onSubmit: (note: Note) => void;
  onCancel: () => void;
  initialNote?: Partial<Note>;
}

// Use Google Calendar colors for consistency, with Graphite (matching bg-card) first
const NOTE_COLORS = [
  { name: 'Graphite', value: 'hsl(var(--card))' }, // Matches card background
  ...Object.values(GOOGLE_CALENDAR_COLORS)
    .filter(({ name }) => name !== 'Graphite')
    .map(({ hex, name }) => ({ name, value: hex })),
];

export function AddNoteForm({ onSubmit, onCancel, initialNote }: AddNoteFormProps) {
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [folder, setFolder] = useState(initialNote?.folder || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialNote?.tags || []);
  const [color, setColor] = useState(initialNote?.color || 'hsl(var(--card))'); // Default to Graphite
  const [images, setImages] = useState<string[]>(initialNote?.images || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if using a custom color (not Graphite)
  const hasCustomColor = color && color !== 'hsl(var(--card))';
  const isGraphite = color === 'hsl(var(--card))';
  const useWhiteText = hasCustomColor && !isGraphite;

  // Dynamic styles based on color
  const inputClassName = useWhiteText
    ? "bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-0"
    : "bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0";
  
  const labelClassName = useWhiteText
    ? "text-white/80"
    : "text-muted-foreground";
  
  const buttonClassName = useWhiteText
    ? "border-white/30 text-white/80 hover:text-white hover:bg-white/10"
    : "border-border text-foreground/70 hover:text-foreground hover:bg-secondary";

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setImages(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedTitle = sanitizeText(title);
    if (!sanitizedTitle) return;

    onSubmit({
      id: initialNote?.id || uuidv4(),
      title: sanitizedTitle,
      content: sanitizeHtml(content),
      tags: tags.map(sanitizeText).filter(Boolean),
      folder: sanitizeText(folder) || undefined,
      createdAt: initialNote?.createdAt || new Date(),
      updatedAt: new Date(),
      isPinned: initialNote?.isPinned || false,
      isFavorite: initialNote?.isFavorite || false,
      color: color || undefined,
      images: images.length > 0 ? images : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
      <div className="space-y-2">
        <Label htmlFor="title" className={labelClassName}>
          <FileText className="h-4 w-4 inline mr-1" />
          Note Title *
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your note a title"
          autoFocus
          className={cn("h-10", inputClassName)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content" className={labelClassName}>Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your thoughts..."
          rows={5}
          className={cn("resize-none", inputClassName)}
        />
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={cn(
                "h-7 w-7 rounded-md transition-all",
                color === c.value 
                  ? useWhiteText 
                    ? "ring-2 ring-offset-2 ring-offset-transparent ring-white scale-110" 
                    : "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110"
                  : "hover:scale-105"
              )}
              style={{ backgroundColor: c.value || 'hsl(var(--card))' }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-10 px-4", buttonClassName)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Images
        </button>
        
        {/* Image Previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {images.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={img}
                  alt={`Note image ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="folder" className={labelClassName}>Folder (optional)</Label>
        <Input
          id="folder"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="e.g., Work, Personal, Ideas"
          className={cn("h-10", inputClassName)}
        />
      </div>

      <div className="space-y-2">
        <Label className={labelClassName}>
          <Tag className="h-4 w-4 inline mr-1" />
          Tags
        </Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a tag and press Enter"
            className={cn("flex-1 h-10", inputClassName)}
          />
          <Button type="button" variant="ghost" onClick={addTag} className={cn("h-10 w-10 px-0 border", buttonClassName)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs",
                  useWhiteText ? "bg-white/20 text-white/80" : "bg-secondary text-muted-foreground"
                )}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className={useWhiteText ? "hover:text-white transition-colors" : "hover:text-red-400 transition-colors"}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={cn("flex justify-end gap-2 pt-2 sticky bottom-0 pb-2", hasCustomColor ? "bg-transparent" : "bg-card")}>
        <Button type="button" variant="ghost" onClick={onCancel} className={cn("h-10", useWhiteText ? "text-white/80 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary")}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!title.trim()}
          className="bg-white/75 border border-white text-neutral-950 hover:bg-white hover:border-white h-10"
        >
          {initialNote ? 'Save Changes' : 'Add Note'}
        </Button>
      </div>
    </form>
  );
}
