import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { signIn, isAuthenticated } from '@/lib/google-auth';


interface AuthWallProps {
  children: React.ReactNode;
}

export function AuthWall({ children }: AuthWallProps) {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const auth = await isAuthenticated();
      setIsSignedIn(auth);
    }
    checkAuth();

    // Check auth periodically
    const interval = setInterval(async () => {
      const auth = await isAuthenticated();
      setIsSignedIn(prev => {
        if (prev !== auth) return auth;
        return prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (isSignedIn === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground"></div>
          <p className="mt-4 text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not signed in - show auth wall
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="bg-card border-border max-w-md w-full">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-foreground">
              Welcome to Optimio
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Your Personal Productivity Workspace
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Google Calendar Sync</p>
                  <p className="text-xs text-muted-foreground">
                    Sync and manage your events seamlessly
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Tasks & Goals</p>
                  <p className="text-xs text-muted-foreground">
                    Track your todos and achieve your goals
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Notes</p>
                  <p className="text-xs text-muted-foreground">
                    Capture ideas and organize your thoughts
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button 
                onClick={signIn}
                className="w-full bg-white text-black hover:bg-white/90 h-12 text-base"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
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
                Sign in with Google
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Your data is stored locally on your device
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signed in - show the app
  return <>{children}</>;
}
