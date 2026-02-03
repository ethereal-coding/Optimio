import { useState, useEffect, useMemo } from 'react';
import { useAppState } from '@/hooks/useAppState';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Search,
  Calendar as CalendarIcon,
  CheckCircle2,
  Target,
  FileText,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

interface SearchResult {
  id: string;
  type: 'event' | 'todo' | 'goal' | 'note';
  title: string;
  description?: string;
  metadata?: string;
  priority?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const { state, dispatch } = useAppState();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Search across all entities with smart type matching
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    const allResults: Array<SearchResult & { score: number }> = [];

    // Detect type-based keywords
    const typeKeywords: Record<string, 'event' | 'todo' | 'goal' | 'note'> = {
      'event': 'event',
      'events': 'event',
      'calendar': 'event',
      'meeting': 'event',
      'task': 'todo',
      'tasks': 'todo',
      'todo': 'todo',
      'todos': 'todo',
      'goal': 'goal',
      'goals': 'goal',
      'target': 'goal',
      'note': 'note',
      'notes': 'note',
      'document': 'note',
    };

    let typeFilter: 'event' | 'todo' | 'goal' | 'note' | null = null;
    for (const [keyword, type] of Object.entries(typeKeywords)) {
      if (searchTerm === keyword || searchTerm.startsWith(keyword + ' ') || searchTerm.endsWith(' ' + keyword)) {
        typeFilter = type;
        break;
      }
    }

    // Search Events
    state.calendars.forEach((calendar) => {
      calendar.events.forEach((event) => {
        const matchesTitle = event.title.toLowerCase().includes(searchTerm);
        const matchesDescription = event.description?.toLowerCase().includes(searchTerm);
        const matchesLocation = event.location?.toLowerCase().includes(searchTerm);
        const matchesType = typeFilter === 'event';

        if (matchesTitle || matchesDescription || matchesLocation || matchesType) {
          let score = 0;
          if (matchesTitle) score += 10;
          if (matchesDescription) score += 5;
          if (matchesLocation) score += 3;
          if (matchesType) score += 15;

          allResults.push({
            id: event.id,
            type: 'event',
            title: event.title,
            description: event.description,
            metadata: event.location || format(event.startTime, 'MMM d, yyyy h:mm a'),
            icon: CalendarIcon,
            color: event.color,
            score
          });
        }
      });
    });

    // Search Todos
    state.todos.forEach((todo) => {
      const matchesTitle = todo.title.toLowerCase().includes(searchTerm);
      const matchesDescription = todo.description?.toLowerCase().includes(searchTerm);
      const matchesCategory = todo.category?.toLowerCase().includes(searchTerm);
      const matchesPriority = todo.priority?.toLowerCase().includes(searchTerm);
      const matchesType = typeFilter === 'todo';

      if (matchesTitle || matchesDescription || matchesCategory || matchesPriority || matchesType) {
        let score = 0;
        if (matchesTitle) score += 10;
        if (matchesDescription) score += 5;
        if (matchesCategory) score += 3;
        if (matchesPriority) score += 4;
        if (matchesType) score += 15;

        allResults.push({
          id: todo.id,
          type: 'todo',
          title: todo.title,
          description: todo.description,
          metadata: todo.category,
          priority: todo.priority,
          icon: CheckCircle2,
          score
        });
      }
    });

    // Search Goals
    state.goals.forEach((goal) => {
      const matchesTitle = goal.title.toLowerCase().includes(searchTerm);
      const matchesDescription = goal.description?.toLowerCase().includes(searchTerm);
      const matchesCategory = goal.category?.toLowerCase().includes(searchTerm);
      const matchesType = typeFilter === 'goal';

      if (matchesTitle || matchesDescription || matchesCategory || matchesType) {
        let score = 0;
        if (matchesTitle) score += 10;
        if (matchesDescription) score += 5;
        if (matchesCategory) score += 3;
        if (matchesType) score += 15;

        const progress = Math.round((goal.currentValue / goal.targetValue) * 100);
        allResults.push({
          id: goal.id,
          type: 'goal',
          title: goal.title,
          description: goal.description,
          metadata: `${progress}% complete`,
          icon: Target,
          color: goal.color,
          score
        });
      }
    });

    // Search Notes
    state.notes.forEach((note) => {
      const matchesTitle = note.title.toLowerCase().includes(searchTerm);
      const matchesContent = note.content.toLowerCase().includes(searchTerm);
      const matchesFolder = note.folder?.toLowerCase().includes(searchTerm);
      const matchesTags = note.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      const matchesType = typeFilter === 'note';

      if (matchesTitle || matchesContent || matchesFolder || matchesTags || matchesType) {
        let score = 0;
        if (matchesTitle) score += 10;
        if (matchesContent) score += 5;
        if (matchesFolder) score += 3;
        if (matchesTags) score += 4;
        if (matchesType) score += 15;

        allResults.push({
          id: note.id,
          type: 'note',
          title: note.title,
          description: note.content.slice(0, 100),
          metadata: note.folder || note.tags.join(', '),
          icon: FileText,
          score
        });
      }
    });

    // Sort by score (highest first)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return allResults.sort((a, b) => b.score - a.score).map(({ score: _score, ...result }) => result);
  }, [query, state.calendars, state.todos, state.goals, state.notes]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSelectResult = (result: SearchResult) => {
    // Set the item to open
    dispatch(actions.setSelectedItemToOpen({ type: result.type, id: result.id }));

    // Navigate to the appropriate view
    switch (result.type) {
      case 'event':
        dispatch(actions.setView('calendar'));
        break;
      case 'todo':
        dispatch(actions.setView('todos'));
        break;
      case 'goal':
        dispatch(actions.setView('goals'));
        break;
      case 'note':
        dispatch(actions.setView('notes'));
        break;
    }
    onOpenChange(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex, handleSelectResult]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'event': return 'Event';
      case 'todo': return 'Task';
      case 'goal': return 'Goal';
      case 'note': return 'Note';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl p-0 pr-16">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything... (tasks, events, goals, notes)"
            className="flex-1 bg-transparent border-0 text-foreground placeholder:text-foreground/30 focus:ring-0 focus:outline-none h-auto p-0 text-base"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="h-[400px] overflow-y-auto custom-scrollbar">
          {results.length === 0 && query.trim() !== '' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Search className="h-12 w-12 text-foreground/20 mb-3" />
              <p className="text-foreground/60 text-sm">No results found for "{query}"</p>
              <p className="text-muted-foreground text-xs mt-1">Try a different search term</p>
            </div>
          )}

          {results.length === 0 && query.trim() === '' && (
            <div className="py-2">
              {/* Recent Tasks */}
              {state.todos.slice(0, 10).length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground flex items-center justify-between">
                    <span>Recent Tasks</span>
                    <span className="text-foreground/30">{state.todos.length} total</span>
                  </div>
                  {state.todos.slice(0, 10).map((todo) => (
                    <button
                      key={todo.id}
                      onClick={() => {
                        dispatch(actions.setSelectedItemToOpen({ type: 'todo', id: todo.id }));
                        dispatch(actions.setView('todos'));
                        onOpenChange(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        todo.completed ? 'bg-green-500/20' : 'bg-secondary'
                      }`}>
                        <CheckCircle2 className={`h-4 w-4 ${
                          todo.completed ? 'text-green-400' : 'text-foreground/60'
                        }`} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium truncate ${
                            todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}>{todo.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            todo.priority === 'high' ? 'bg-red-500/50 text-red-400 border border-red-500' :
                            todo.priority === 'medium' ? 'bg-yellow-500/50 text-yellow-400 border border-yellow-500' :
                            'bg-blue-500/50 text-blue-400 border border-blue-500'
                          }`}>
                            {todo.priority}
                          </span>
                          {todo.category && (
                            <span className="text-foreground/30 text-xs">• {todo.category}</span>
                          )}
                          {todo.dueDate && (
                            <span className="text-foreground/30 text-xs">• {format(todo.dueDate, 'MMM d')}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-foreground/20 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Events */}
              {state.calendars.flatMap(cal => cal.events).slice(0, 10).length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground flex items-center justify-between">
                    <span>Recent Events</span>
                    <span className="text-foreground/30">{state.calendars.flatMap(cal => cal.events).length} total</span>
                  </div>
                  {state.calendars.flatMap(cal => cal.events).slice(0, 10).map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        dispatch(actions.setSelectedItemToOpen({ type: 'event', id: event.id }));
                        dispatch(actions.setView('calendar'));
                        onOpenChange(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors"
                    >
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: event.color ? `${event.color}20` : 'rgba(255,255,255,0.05)' }}
                      >
                        <CalendarIcon className="h-4 w-4" style={{ color: event.color || 'rgba(255,255,255,0.6)' }} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-foreground text-sm font-medium truncate mb-1">{event.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(event.startTime, 'MMM d, h:mm a')}</span>
                          {event.location && (
                            <>
                              <span>•</span>
                              <span className="truncate">{event.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-foreground/20 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Goals */}
              {state.goals.slice(0, 10).length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground flex items-center justify-between">
                    <span>Recent Goals</span>
                    <span className="text-foreground/30">{state.goals.length} total</span>
                  </div>
                  {state.goals.slice(0, 10).map((goal) => {
                    const progress = Math.round((goal.currentValue / goal.targetValue) * 100);
                    return (
                      <button
                        key={goal.id}
                        onClick={() => {
                          dispatch(actions.setSelectedItemToOpen({ type: 'goal', id: goal.id }));
                          dispatch(actions.setView('goals'));
                          onOpenChange(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors"
                      >
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-secondary">
                          <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-foreground text-sm font-medium truncate mb-1.5">{goal.title}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all bg-primary"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">{progress}%</span>
                          </div>
                          {goal.category && (
                            <div className="mt-1 text-xs text-foreground/30">{goal.category}</div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-foreground/20 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Recent Notes */}
              {state.notes.slice(0, 10).length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground flex items-center justify-between">
                    <span>Recent Notes</span>
                    <span className="text-foreground/30">{state.notes.length} total</span>
                  </div>
                  {state.notes.slice(0, 10).map((note) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        dispatch(actions.setSelectedItemToOpen({ type: 'note', id: note.id }));
                        dispatch(actions.setView('notes'));
                        onOpenChange(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-foreground/60" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-foreground text-sm font-medium truncate mb-1">{note.title}</div>
                        <div className="text-foreground/30 text-xs truncate mb-1">
                          {note.content.slice(0, 60)}...
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {note.folder && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary text-muted-foreground">
                              {note.folder}
                            </span>
                          )}
                          {note.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400">
                              #{tag}
                            </span>
                          ))}
                          {note.tags.length > 2 && (
                            <span className="text-[10px] text-foreground/30">+{note.tags.length - 2}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-foreground/20 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2 min-h-full">
              {results.map((result, index) => {
                const Icon = result.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelectResult(result)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                      isSelected ? 'bg-accent' : 'hover:bg-secondary'
                    }`}
                  >
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: result.color ? `${result.color}20` : 'rgba(255,255,255,0.05)' }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: result.color || 'rgba(255,255,255,0.6)' }}
                      />
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-foreground text-sm font-medium truncate">
                          {result.title}
                        </span>
                        {result.priority && (
                          <span className={`text-xs ${getPriorityColor(result.priority)}`}>
                            {result.priority}
                          </span>
                        )}
                      </div>
                      {(result.description || result.metadata) && (
                        <p className="text-muted-foreground text-xs truncate">
                          {result.description || result.metadata}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-muted-foreground text-xs">
                        {getTypeLabel(result.type)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-foreground/20" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center justify-end px-4 py-2 border-t border-border text-xs text-muted-foreground">
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
