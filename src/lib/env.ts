/**
 * Environment configuration with runtime validation
 * Fail-fast approach - app won't start if config is invalid
 */

import { z } from 'zod';

// =============================================================================
// Schema Definition
// =============================================================================

const envSchema = z.object({
  // Required
  VITE_GOOGLE_CLIENT_ID: z.string().min(1, 'Google Client ID is required'),
  
  // Optional with defaults
  VITE_API_URL: z.string().default(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'),
  VITE_SYNC_INTERVAL: z.string().default('10000').transform((val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) throw new Error('VITE_SYNC_INTERVAL must be a number');
    return parsed;
  }),
  VITE_APP_NAME: z.string().default('Optimio'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
});

// =============================================================================
// Type Export
// =============================================================================

export type Env = z.infer<typeof envSchema>;

// =============================================================================
// Validation Function
// =============================================================================

function validateEnv(): Env {
  try {
    const env = envSchema.parse({
      VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_SYNC_INTERVAL: import.meta.env.VITE_SYNC_INTERVAL,
      VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
      VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
    });

    // Log successful load (mask sensitive data)
    if (import.meta.env.DEV) {
      console.log(
        `%c✓ Environment loaded:\n` +
        `  App: ${env.VITE_APP_NAME} v${env.VITE_APP_VERSION}\n` +
        `  API: ${env.VITE_API_URL}\n` +
        `  Sync Interval: ${env.VITE_SYNC_INTERVAL}ms\n` +
        `  Google Client: ${env.VITE_GOOGLE_CLIENT_ID.substring(0, 10)}...`,
        'color: #10b981; font-weight: bold;'
      );
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
      
      // Pretty error box
      const errorMessage = 
        '\n╔════════════════════════════════════════════════════════════╗\n' +
        '║  ENVIRONMENT CONFIGURATION ERROR                           ║\n' +
        '╠════════════════════════════════════════════════════════════╣\n' +
        `║  ${issues.padEnd(58)} ║\n` +
        '╠════════════════════════════════════════════════════════════╣\n' +
        '║  Check your .env file or environment variables.            ║\n' +
        '║  Required: VITE_GOOGLE_CLIENT_ID                           ║\n' +
        '╚════════════════════════════════════════════════════════════╝\n';
      
      console.error(errorMessage);
      
      throw new Error(`Environment validation failed: ${error.issues.map(i => i.message).join(', ')}`);
    }
    throw error;
  }
}

// =============================================================================
// Export Validated Config
// =============================================================================

export const env = validateEnv();

// Individual exports for convenience
export const VITE_GOOGLE_CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID;
export const VITE_API_URL = env.VITE_API_URL;
export const VITE_SYNC_INTERVAL = env.VITE_SYNC_INTERVAL;
export const VITE_APP_NAME = env.VITE_APP_NAME;
export const VITE_APP_VERSION = env.VITE_APP_VERSION;

export default env;
