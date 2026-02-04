import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Archive, Download, Upload } from 'lucide-react';
import { RecyclingBin } from './RecyclingBin';

interface FeatureUtilitiesProps {
  type: 'events' | 'todos' | 'goals' | 'notes';
}

export function FeatureUtilities({ type }: FeatureUtilitiesProps) {
  const [recyclingBinOpen, setRecyclingBinOpen] = useState(false);

  const getTypeLabel = () => {
    switch (type) {
      case 'events': return 'Events';
      case 'todos': return 'Tasks';
      case 'goals': return 'Goals';
      case 'notes': return 'Notes';
      default: return type;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-secondary"
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setRecyclingBinOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Recycling Bin
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem disabled>
            <Archive className="h-4 w-4 mr-2" />
            Archive
            <span className="ml-auto text-xs text-muted-foreground">Soon</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem disabled>
            <Download className="h-4 w-4 mr-2" />
            Export {getTypeLabel()}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Upload className="h-4 w-4 mr-2" />
            Import {getTypeLabel()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RecyclingBin
        open={recyclingBinOpen}
        onOpenChange={setRecyclingBinOpen}
        type={type}
      />
    </>
  );
}
