import { createContext, useContext, useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { state } = useAppState();
  const theme = state.user?.preferences?.theme || 'dark';

  useEffect(() => {
    const root = document.documentElement;
    console.log('🎨 ThemeProvider: Applying theme:', theme);

    // Handle 'auto' mode
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const appliedTheme = isDark ? 'dark' : 'light';
      console.log('🎨 Auto mode detected, applying:', appliedTheme);
      root.setAttribute('data-theme', appliedTheme);

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        console.log('🎨 System theme changed to:', newTheme);
        root.setAttribute('data-theme', newTheme);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      console.log('🎨 Setting data-theme attribute to:', theme);
      root.setAttribute('data-theme', theme);
      console.log('🎨 Current data-theme:', root.getAttribute('data-theme'));
    }
  }, [theme]);

  return <ThemeContext.Provider value={undefined}>{children}</ThemeContext.Provider>;
}
