/**
 * Feature Flags System
 * Enable gradual rollouts and A/B testing
 */

import { useMemo } from 'react';

// =============================================================================
// Feature Flag Types
// =============================================================================

type Environment = 'development' | 'staging' | 'production';

interface FeatureConfig {
  /** Default value for the feature */
  defaultValue: boolean;
  /** Rollout percentage (0-100) */
  rolloutPercentage?: number;
  /** Override for specific environments */
  environments?: Partial<Record<Environment, boolean>>;
  /** Description of the feature */
  description?: string;
}

interface FeatureState extends FeatureConfig {
  name: string;
  /** Whether feature is enabled for current user */
  isEnabled: boolean;
  /** Source of the flag value */
  source: 'default' | 'environment' | 'localStorage' | 'rollout';
}

// =============================================================================
// Feature Definitions
// =============================================================================

const FEATURES: Record<string, FeatureConfig> = {
  NEW_CALENDAR_VIEW: {
    defaultValue: false,
    rolloutPercentage: 0,
    environments: {
      development: true,
    },
    description: 'New calendar view with improved UX',
  },
  OFFLINE_MODE: {
    defaultValue: true,
    rolloutPercentage: 100,
    description: 'Enable offline support with service worker',
  },
  ADVANCED_SEARCH: {
    defaultValue: false,
    rolloutPercentage: 10,
    environments: {
      development: true,
      staging: true,
    },
    description: 'Advanced search with filters and operators',
  },
  COLLABORATION: {
    defaultValue: false,
    rolloutPercentage: 0,
    environments: {
      development: false, // Not ready yet
    },
    description: 'Share calendars and collaborate with others',
  },
  ANALYTICS_V2: {
    defaultValue: false,
    rolloutPercentage: 50,
    environments: {
      development: true,
    },
    description: 'New analytics dashboard',
  },
};

// =============================================================================
// User ID Hashing (for consistent rollout)
// =============================================================================

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function isUserInRollout(userId: string, percentage: number): boolean {
  const hash = hashString(userId);
  return (hash % 100) < percentage;
}

// =============================================================================
// Storage Helpers
// =============================================================================

const STORAGE_KEY = 'optimio_feature_overrides';

function getLocalStorageOverrides(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setLocalStorageOverride(featureName: string, value: boolean): void {
  try {
    const overrides = getLocalStorageOverrides();
    overrides[featureName] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore storage errors
  }
}

function clearLocalStorageOverride(featureName: string): void {
  try {
    const overrides = getLocalStorageOverrides();
    delete overrides[featureName];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore storage errors
  }
}

// =============================================================================
// Feature Flag Evaluation
// =============================================================================

interface EvaluateOptions {
  userId?: string;
  environment?: Environment;
}

function evaluateFeature(
  name: string,
  config: FeatureConfig,
  options: EvaluateOptions = {}
): FeatureState {
  const { userId, environment = 'production' } = options;
  
  // Check localStorage override (development only)
  if (environment === 'development') {
    const overrides = getLocalStorageOverrides();
    if (name in overrides) {
      return {
        name,
        ...config,
        isEnabled: overrides[name],
        source: 'localStorage',
      };
    }
  }
  
  // Check environment override
  if (config.environments?.[environment] !== undefined) {
    return {
      name,
      ...config,
      isEnabled: config.environments[environment]!,
      source: 'environment',
    };
  }
  
  // Check rollout percentage
  if (config.rolloutPercentage !== undefined && config.rolloutPercentage < 100) {
    const inRollout = userId 
      ? isUserInRollout(userId, config.rolloutPercentage)
      : false;
    
    return {
      name,
      ...config,
      isEnabled: inRollout,
      source: 'rollout',
    };
  }
  
  // Return default
  return {
    name,
    ...config,
    isEnabled: config.defaultValue,
    source: 'default',
  };
}

// =============================================================================
// Hook
// =============================================================================

let globalOptions: EvaluateOptions = {};

export function initializeFeatureFlags(options: EvaluateOptions): void {
  globalOptions = options;
}

export function useFeature(featureName: string): boolean {
  const state = useMemo(() => {
    const config = FEATURES[featureName];
    if (!config) {
      console.warn(`Unknown feature: ${featureName}`);
      return false;
    }
    return evaluateFeature(featureName, config, globalOptions).isEnabled;
  }, [featureName]);
  
  return state;
}

export function useFeatureDetailed(featureName: string): FeatureState {
  const state = useMemo(() => {
    const config = FEATURES[featureName];
    if (!config) {
      return {
        name: featureName,
        defaultValue: false,
        isEnabled: false,
        source: 'default' as const,
        description: 'Unknown feature',
      };
    }
    return evaluateFeature(featureName, config, globalOptions);
  }, [featureName]);
  
  return state;
}

export function useAllFeatures(): Record<string, FeatureState> {
  const states = useMemo(() => {
    const result: Record<string, FeatureState> = {};
    for (const [name, config] of Object.entries(FEATURES)) {
      result[name] = evaluateFeature(name, config, globalOptions);
    }
    return result;
  }, []);
  
  return states;
}

// =============================================================================
// Direct Access (for non-React code)
// =============================================================================

export function isFeatureEnabled(featureName: string, options?: EvaluateOptions): boolean {
  const config = FEATURES[featureName];
  if (!config) return false;
  
  return evaluateFeature(featureName, config, options || globalOptions).isEnabled;
}

export function getFeatureState(featureName: string, options?: EvaluateOptions): FeatureState {
  const config = FEATURES[featureName];
  if (!config) {
    return {
      name: featureName,
      defaultValue: false,
      isEnabled: false,
      source: 'default' as const,
      description: 'Unknown feature',
    };
  }
  
  return evaluateFeature(featureName, config, options || globalOptions);
}

// =============================================================================
// Management (for dev tools)
// =============================================================================

export const FeatureFlagsManager = {
  /** Get all available features */
  getAllFeatures: () => Object.keys(FEATURES),
  
  /** Override a feature in localStorage (dev only) */
  override: (featureName: string, value: boolean): void => {
    setLocalStorageOverride(featureName, value);
  },
  
  /** Clear a localStorage override */
  clearOverride: (featureName: string): void => {
    clearLocalStorageOverride(featureName);
  },
  
  /** Get all localStorage overrides */
  getOverrides: getLocalStorageOverrides,
  
  /** Clear all overrides */
  clearAllOverrides: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },
};

// =============================================================================
// React Component for Conditional Rendering
// =============================================================================

import type { ReactNode } from 'react';

interface FeatureFlagProps {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureFlag({ name, children, fallback = null }: FeatureFlagProps) {
  const isEnabled = useFeature(name);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
}

export default useFeature;
