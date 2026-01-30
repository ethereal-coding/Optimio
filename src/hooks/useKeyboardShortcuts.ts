import { useEffect } from 'react';
import { useAppState, actions } from './useAppState';
import { debug } from '@/lib/debug';

export interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
  description: string;
}

/**
 * Global keyboard shortcuts for Optimio
 * CMD/CTRL + K = Search
 * CMD/CTRL + N = New item (context-aware)
 * CMD/CTRL + , = Settings
 * CMD/CTRL + B = Toggle sidebar
 * ESC = Close modal/dialog
 * G then D = Go to Dashboard
 * G then C = Go to Calendar
 * G then T = Go to Todos
 * G then G = Go to Goals
 * G then N = Go to Notes
 */
export function useKeyboardShortcuts(handlers?: {
  onSearch?: () => void;
  onNewItem?: () => void;
  onSettings?: () => void;
  onCloseModal?: () => void;
}) {
  const { state, dispatch } = useAppState();

  useEffect(() => {
    let gPressed = false;
    let gTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // CMD/CTRL + K = Search
      if (cmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        handlers?.onSearch?.();
        debug.log('🔍 Search shortcut');
        return;
      }

      // CMD/CTRL + N = New item (context-aware)
      if (cmdOrCtrl && e.key === 'n') {
        e.preventDefault();
        handlers?.onNewItem?.();
        debug.log('➕ New item shortcut');
        return;
      }

      // CMD/CTRL + , = Settings
      if (cmdOrCtrl && e.key === ',') {
        e.preventDefault();
        handlers?.onSettings?.();
        debug.log('⚙️ Settings shortcut');
        return;
      }

      // CMD/CTRL + B = Toggle sidebar
      if (cmdOrCtrl && e.key === 'b') {
        e.preventDefault();
        dispatch(actions.toggleSidebar());
        debug.log('📱 Toggle sidebar');
        return;
      }

      // ESC = Close modal
      if (e.key === 'Escape') {
        handlers?.onCloseModal?.();
        return;
      }

      // G key navigation (Gmail-style)
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        gPressed = true;
        clearTimeout(gTimeout);
        gTimeout = setTimeout(() => {
          gPressed = false;
        }, 1000);
        return;
      }

      // G + [key] navigation
      if (gPressed) {
        gPressed = false;
        clearTimeout(gTimeout);

        switch (e.key) {
          case 'd':
            e.preventDefault();
            dispatch(actions.setView('dashboard'));
            debug.log('🏠 Go to Dashboard');
            break;
          case 'c':
            e.preventDefault();
            dispatch(actions.setView('calendar'));
            debug.log('📅 Go to Calendar');
            break;
          case 't':
            e.preventDefault();
            dispatch(actions.setView('todos'));
            debug.log('✅ Go to Todos');
            break;
          case 'g':
            e.preventDefault();
            dispatch(actions.setView('goals'));
            debug.log('🎯 Go to Goals');
            break;
          case 'n':
            e.preventDefault();
            dispatch(actions.setView('notes'));
            debug.log('📝 Go to Notes');
            break;
        }
      }

      // Arrow keys for date navigation (when not in input)
      if (!isInputFocused() && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        if (e.key === 'ArrowLeft') {
          const prevDay = new Date(state.selectedDate);
          prevDay.setDate(prevDay.getDate() - 1);
          dispatch(actions.setSelectedDate(prevDay));
        } else {
          const nextDay = new Date(state.selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          dispatch(actions.setSelectedDate(nextDay));
        }
      }

      // T = Go to today
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !isInputFocused()) {
        dispatch(actions.setSelectedDate(new Date()));
        debug.log('📅 Go to today');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [state.selectedDate, state.view, dispatch, handlers]);
}

/**
 * Check if an input/textarea is currently focused
 */
function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement?.getAttribute('contenteditable') === 'true'
  );
}

/**
 * Get shortcut display string
 */
export function getShortcutDisplay(shortcut: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return shortcut.replace('CMD', isMac ? '⌘' : 'Ctrl').replace('CTRL', isMac ? '⌘' : 'Ctrl');
}

/**
 * List of all shortcuts for help dialog
 */
export const SHORTCUTS: ShortcutHandler[] = [
  {
    key: 'CMD+K',
    handler: () => {},
    description: 'Search'
  },
  {
    key: 'CMD+N',
    handler: () => {},
    description: 'New item'
  },
  {
    key: 'CMD+B',
    handler: () => {},
    description: 'Toggle sidebar'
  },
  {
    key: 'CMD+,',
    handler: () => {},
    description: 'Settings'
  },
  {
    key: 'ESC',
    handler: () => {},
    description: 'Close dialog'
  },
  {
    key: 'G then D',
    handler: () => {},
    description: 'Go to Dashboard'
  },
  {
    key: 'G then C',
    handler: () => {},
    description: 'Go to Calendar'
  },
  {
    key: 'G then T',
    handler: () => {},
    description: 'Go to Todos'
  },
  {
    key: 'G then G',
    handler: () => {},
    description: 'Go to Goals'
  },
  {
    key: 'G then N',
    handler: () => {},
    description: 'Go to Notes'
  },
  {
    key: 'T',
    handler: () => {},
    description: 'Go to today'
  },
  {
    key: '← →',
    handler: () => {},
    description: 'Previous/Next day'
  }
];
