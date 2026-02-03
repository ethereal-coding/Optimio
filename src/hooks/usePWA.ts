/**
 * PWA Hook
 * Manages service worker registration, install prompts, and offline status
 */

import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  /** Whether the app can be installed */
  isInstallable: boolean;
  /** Whether the device is offline */
  isOffline: boolean;
  /** Whether the app is installed (standalone mode) */
  isInstalled: boolean;
  /** Whether the service worker is ready */
  isReady: boolean;
  /** Whether an update is available */
  updateAvailable: boolean;
  /** App version from service worker */
  version: string | null;
}

interface PWAActions {
  /** Trigger the install prompt */
  installApp: () => Promise<void>;
  /** Apply service worker update */
  applyUpdate: () => void;
  /** Request push notification permission */
  requestNotificationPermission: () => Promise<NotificationPermission>;
  /** Check for service worker update */
  checkForUpdate: () => Promise<void>;
}

type PWAHookReturn = PWAState & PWAActions;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

interface ServiceWorkerMessage {
  type?: string;
  version?: string;
}

/**
 * Hook for managing PWA functionality
 * 
 * @example
 * ```tsx
 * const { isInstallable, isOffline, installApp } = usePWA();
 * 
 * return (
 *   <div>
 *     {isOffline && <span>Offline mode</span>}
 *     {isInstallable && <button onClick={installApp}>Install App</button>}
 *   </div>
 * );
 * ```
 */
export function usePWA(): PWAHookReturn {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  
  // Store the install prompt event
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  // Check if app is installed
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as NavigatorStandalone).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };
    
    checkInstalled();
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);
    
    return () => mediaQuery.removeEventListener('change', checkInstalled);
  }, []);
  
  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return;
    }
    
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('Service Worker registered:', registration);
        setIsReady(true);
        
        // Get version from service worker
        if (registration.active) {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event: MessageEvent<ServiceWorkerMessage>) => {
            if (event.data.version) {
              setVersion(event.data.version);
            }
          };
          registration.active.postMessage('GET_VERSION', [messageChannel.port2]);
        }
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker available');
                setUpdateAvailable(true);
              }
            });
          }
        });
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event: MessageEvent<ServiceWorkerMessage>) => {
          if (event.data.type === 'SYNC_COMPLETE') {
            console.log('Background sync completed');
          }
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };
    
    void registerSW();
  }, []);
  
  // Install app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted install');
    } else {
      console.log('User dismissed install');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, [deferredPrompt]);
  
  // Apply service worker update
  const applyUpdate = useCallback(() => {
    if (!navigator.serviceWorker.controller) return;
    
    void navigator.serviceWorker.ready.then((registration) => {
      registration.waiting?.postMessage('SKIP_WAITING');
      setUpdateAvailable(false);
      
      // Reload to activate new service worker
      window.location.reload();
    });
  }, []);
  
  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return 'denied';
    }
    
    const permission = await Notification.requestPermission();
    return permission;
  }, []);
  
  // Check for service worker update
  const checkForUpdate = useCallback(async () => {
    if (!navigator.serviceWorker.controller) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    } catch (error) {
      console.error('Error checking for update:', error);
    }
  }, []);
  
  return {
    isInstallable,
    isOffline,
    isInstalled,
    isReady,
    updateAvailable,
    version,
    installApp,
    applyUpdate,
    requestNotificationPermission,
    checkForUpdate,
  };
}

export default usePWA;
