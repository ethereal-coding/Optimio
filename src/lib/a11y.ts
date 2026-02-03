/**
 * Accessibility utilities
 * Helper functions for ARIA attributes and focus management
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// ID Generation
// =============================================================================

let idCounter = 0;

/**
 * Generate a unique ID for ARIA attributes
 */
export function generateId(prefix = 'a11y'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now().toString(36)}`;
}

// =============================================================================
// Focus Management
// =============================================================================

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]'
  ];
  
  return focusableSelectors.some((selector) => element.matches(selector));
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]'
  ].join(', ');
  
  return Array.from(container.querySelectorAll(focusableSelectors));
}

/**
 * Focus an element by ID
 */
export function focusElement(elementId: string): void {
  const element = document.getElementById(elementId);
  if (element && isFocusable(element)) {
    element.focus();
  }
}

// =============================================================================
// Focus Trap Hook
// =============================================================================

interface UseFocusTrapOptions {
  /** Whether the trap is active */
  isActive: boolean;
  /** Element to focus when trap activates (defaults to first focusable) */
  initialFocus?: string;
  /** Element to return focus to when trap deactivates */
  returnFocus?: string;
}

/**
 * Hook to trap focus within a container (for modals, dialogs)
 */
export function useFocusTrap({ isActive, initialFocus, returnFocus }: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (!isActive) return;
    
    // Save current focus
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Set initial focus
    if (initialFocus) {
      focusElement(initialFocus);
    } else {
      const focusableElements = getFocusableElements(container);
      focusableElements[0]?.focus();
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Shift + Tab on first element -> go to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab on last element -> go to first
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Restore previous focus
      if (returnFocus) {
        focusElement(returnFocus);
      } else if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, initialFocus, returnFocus]);
  
  return containerRef;
}

// =============================================================================
// Screen Reader Announcements
// =============================================================================

/**
 * Announce a message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement is read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Hook for making announcements
 */
export function useAnnouncer() {
  const announceCallback = useCallback((message: string, priority?: 'polite' | 'assertive') => {
    announce(message, priority);
  }, []);
  
  return { announce: announceCallback };
}

// =============================================================================
// ARIA Helper Props
// =============================================================================

interface AriaErrorProps {
  'aria-invalid': boolean;
  'aria-errormessage'?: string;
  'aria-describedby'?: string;
}

/**
 * Get ARIA props for form fields with errors
 */
export function getAriaErrorProps(
  hasError: boolean,
  errorMessageId?: string,
  descriptionId?: string
): AriaErrorProps {
  const props: AriaErrorProps = {
    'aria-invalid': hasError,
  };
  
  if (hasError && errorMessageId) {
    props['aria-errormessage'] = errorMessageId;
  }
  
  if (descriptionId) {
    props['aria-describedby'] = descriptionId;
  }
  
  return props;
}

interface AriaExpandedProps {
  'aria-expanded': boolean;
  'aria-controls'?: string;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}

/**
 * Get ARIA props for expandable components
 */
export function getAriaExpandedProps(
  isExpanded: boolean,
  controlsId?: string,
  hasPopup?: AriaExpandedProps['aria-haspopup']
): AriaExpandedProps {
  const props: AriaExpandedProps = {
    'aria-expanded': isExpanded,
  };
  
  if (controlsId) {
    props['aria-controls'] = controlsId;
  }
  
  if (hasPopup) {
    props['aria-haspopup'] = hasPopup;
  }
  
  return props;
}

// =============================================================================
// Route Announcements
// =============================================================================

/**
 * Announce route changes for SPA navigation
 */
export function announceRouteChange(pageTitle: string): void {
  announce(`Navigated to ${pageTitle}`, 'polite');
}

// =============================================================================
// Common ARIA Roles
// =============================================================================

export const ARIA_ROLES = {
  alert: 'alert',
  alertdialog: 'alertdialog',
  button: 'button',
  checkbox: 'checkbox',
  dialog: 'dialog',
  grid: 'grid',
  gridcell: 'gridcell',
  link: 'link',
  listbox: 'listbox',
  menu: 'menu',
  menubar: 'menubar',
  menuitem: 'menuitem',
  navigation: 'navigation',
  option: 'option',
  progressbar: 'progressbar',
  radio: 'radio',
  search: 'search',
  separator: 'separator',
  slider: 'slider',
  status: 'status',
  switch: 'switch',
  tab: 'tab',
  tablist: 'tablist',
  tabpanel: 'tabpanel',
  textbox: 'textbox',
  timer: 'timer',
  toolbar: 'toolbar',
  tooltip: 'tooltip',
  tree: 'tree',
  treeitem: 'treeitem',
} as const;

// =============================================================================
// Focus Management Hooks
// =============================================================================

/**
 * Hook to manage focus on mount
 */
export function useFocusOnMount<T extends HTMLElement>(enabled: boolean = true) {
  const ref = useRef<T>(null);
  
  useEffect(() => {
    if (enabled && ref.current) {
      ref.current.focus();
    }
  }, [enabled]);
  
  return ref;
}

/**
 * Hook to save and restore focus
 */
export function useFocusReturn() {
  const savedFocusRef = useRef<HTMLElement | null>(null);
  
  const saveFocus = useCallback(() => {
    savedFocusRef.current = document.activeElement as HTMLElement;
  }, []);
  
  const restoreFocus = useCallback(() => {
    if (savedFocusRef.current && isFocusable(savedFocusRef.current)) {
      savedFocusRef.current.focus();
    }
  }, []);
  
  return { saveFocus, restoreFocus };
}

// =============================================================================
// User Preference Detection
// =============================================================================

/**
 * Hook to detect reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
}

/**
 * Hook to detect high contrast preference
 */
export function useHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  });
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersHighContrast;
}
