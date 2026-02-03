import { useAppState, actions } from '@/hooks/useAppState';
import { Button } from '@/components/ui/button';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Target,
  FileText,
  Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'todos', label: 'Tasks', icon: CheckSquare },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'notes', label: 'Notes', icon: FileText },
];

export function Sidebar({ isOpen: _isOpen = false, onToggle: _onToggle }: SidebarProps) {
  const { state, dispatch } = useAppState();
  const { view } = state;

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="relative flex flex-col bg-background border-r border-border w-16">
        {/* Logo */}
        <div className="flex h-14 items-center justify-center border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
            <span className="text-sm font-bold">O</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <nav className="space-y-2 flex flex-col items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id;

              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-9 h-9 p-0 flex items-center justify-center transition-colors rounded-lg',
                        isActive
                          ? 'bg-white/75 border border-white text-neutral-950 hover:bg-white hover:text-black'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      )}
                      onClick={() => dispatch(actions.setView(item.id as any))}
                    >
                      <Icon className="size-5 flex-shrink-0" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="bg-popover border-border text-foreground">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </div>

        {/* Settings Button */}
        <div className="border-t border-border py-2 flex items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-9 h-9 p-0 flex items-center justify-center transition-colors rounded-lg',
                  view === 'settings'
                    ? 'bg-white/75 border border-white text-neutral-950 hover:bg-white hover:text-black'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
                onClick={() => dispatch(actions.setView('settings'))}
              >
                <SettingsIcon className="size-5 flex-shrink-0" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="bg-popover border-border text-foreground">
              Settings
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
