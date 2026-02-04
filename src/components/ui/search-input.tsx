import { Search } from 'lucide-react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  wrapperClassName?: string;
}

/**
 * Standardized search input component
 * Used across widgets and pages for consistent styling
 */
export function SearchInput({ 
  placeholder = "Search...", 
  value, 
  onChange, 
  className,
  wrapperClassName 
}: SearchInputProps) {
  return (
    <div className={cn("relative flex-1 max-w-md", wrapperClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "pl-9 h-10 bg-card border-border text-foreground",
          "placeholder:text-muted-foreground rounded-md",
          "hover:border-border-strong focus:border-border-strong",
          "hover:bg-secondary/20 transition-colors shadow-none",
          className
        )}
      />
    </div>
  );
}
