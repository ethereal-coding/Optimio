import { useState, useEffect } from 'react';
import { useAppState, actions } from '@/hooks/useAppState';
import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Bell,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { initializeGoogleAuth, signOut } from '@/lib/google-auth';

interface HeaderProps {
  onSearchOpen?: () => void;
  showDateSelector?: boolean;
}

export function Header({ onSearchOpen, showDateSelector = true }: HeaderProps) {
  const { state, dispatch } = useAppState();
  const { selectedDate, user } = state;
  const [showSignIn, setShowSignIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Initialize Google Auth
  useEffect(() => {
    // Wait for Google Identity Services to load
    const checkGoogleLoaded = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts) {
        clearInterval(checkGoogleLoaded);
        initializeGoogleAuth();
      }
    }, 100);

    return () => clearInterval(checkGoogleLoaded);
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handlePreviousDay = () => {
    dispatch(actions.setSelectedDate(subDays(state.selectedDate, 1)));
  };

  const handleNextDay = () => {
    dispatch(actions.setSelectedDate(addDays(state.selectedDate, 1)));
  };

  const handleToday = () => {
    dispatch(actions.setSelectedDate(new Date()));
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4">
      {/* Left - Date Navigation (only on dashboard) */}
      {showDateSelector && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/50 hover:text-foreground hover:bg-secondary rounded-lg"
              onClick={handlePreviousDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/50 hover:text-foreground hover:bg-secondary rounded-lg"
              onClick={handleNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-foreground/60 hover:text-foreground hover:bg-secondary rounded-md ml-2"
                onClick={handleToday}
              >
                Today
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Right - Actions */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Search Bar */}
        <div className="hidden md:flex">
          <button
            onClick={onSearchOpen}
            className="relative group"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 pointer-events-none" />
            <div className="w-[240px] h-9 pl-9 pr-3 bg-card border border-border text-muted-foreground rounded-lg flex items-center cursor-pointer hover:border-border-strong focus:border-border-strong hover:bg-secondary/30 transition-colors">
              <span className="text-sm">Search...</span>
            </div>
          </button>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg text-foreground/50 hover:text-foreground hover:bg-secondary"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>

        {/* User Greeting or Sign In Button */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex flex-col items-end h-auto py-0.5 px-2 hover:bg-secondary leading-none gap-0.5"
              >
                <span className="text-sm text-foreground font-medium leading-tight">
                  Hello, {user.name.split(' ')[0]}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {format(currentTime, 'h:mm a')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="text-foreground hover:bg-secondary cursor-pointer"
                onClick={() => dispatch(actions.setView('settings'))}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-foreground hover:bg-secondary cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            className="h-9 px-4 bg-transparent border-border text-foreground/90 hover:bg-secondary hover:text-foreground hover:border-border rounded-lg transition-colors"
            onClick={() => setShowSignIn(true)}
          >
            Sign In
          </Button>
        )}
      </div>

      {/* Sign In Dialog */}
      <Dialog open={showSignIn} onOpenChange={setShowSignIn}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground text-2xl font-semibold text-center">
              Welcome to Optimio
            </DialogTitle>
            <DialogDescription className="text-foreground/60 text-center mt-2">
              Sign in with your Google account to sync your calendar, tasks, and goals across all your devices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-6">
            <Button
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg flex items-center justify-center gap-3"
              onClick={async () => {
                try {
                  const { signIn } = await import('@/lib/google-auth');
                  signIn(); // signIn is not async
                  setShowSignIn(false);
                } catch (error) {
                  console.error('Sign-in error:', error);
                }
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="text-center text-xs text-muted-foreground pt-2">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
