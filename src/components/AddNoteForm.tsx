import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, FileText, Plus, Tag } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
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
    if (!title.trim()) return;

    onSubmit({
      id: initialNote?.id || uuidv4(),
      title: title.trim(),
      content: content.trim(),
      tags,
      folder: folder.trim() || undefined,
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
        <Label htmlFor="title" className="text-muted-foreground">
          <FileText className="h-4 w-4 inline mr-1" />
          Note Title *
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your note a title"
          autoFocus
          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content" className="text-muted-foreground">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your thoughts..."
          rows={5}
          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 resize-none"
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
                "w-8 h-8 rounded-full border-2 transition-all",
                color === c.value ? "border-foreground scale-110" : "border-transparent hover:scale-105"
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
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border border-border text-foreground/70 hover:text-foreground hover:bg-secondary h-10 px-4"
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
        <Label htmlFor="folder" className="text-muted-foreground">Folder (optional)</Label>
        <Input
          id="folder"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="e.g., Work, Personal, Ideas"
          className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">
          <Tag className="h-4 w-4 inline mr-1" />
          Tags
        </Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a tag and press Enter"
            className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0 h-10"
          />
          <Button type="button" variant="outline" onClick={addTag} className="border-border text-foreground/50 hover:text-foreground hover:bg-secondary h-10 w-10 px-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-red-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-card pb-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-muted-foreground hover:text-foreground hover:bg-secondary h-10">
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
