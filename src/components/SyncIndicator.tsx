/**
 * Sync status indicator component
 * Shows sync progress, errors, and last sync time
 */

import { useCalendarSync } from '@/hooks/useCalendarSync';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface SyncIndicatorProps {
  /** Optional className for styling */
  className?: string;
  /** Show detailed sync info (default: false) */
  detailed?: boolean;
}

/**
 * Displays sync status indicator
 * 
 * Shows:
 * - Spinning icon when syncing
 * - Error state with retry button if sync fails
 * - Last sync time when idle
 * 
 * @example
 * ```tsx
 * <Header>
 *   <SyncIndicator detailed />
 * </Header>
 * ```
 */
export function SyncIndicator({ className = '', detailed = false }: SyncIndicatorProps) {
  const { isPending, isError, error, lastSyncTime, manualSync, lastSync } = useCalendarSync();

  // Error state
  if (isError) {
    return (
      <button
        onClick={manualSync}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md
          text-red-600 bg-red-50 hover:bg-red-100
          transition-colors duration-200
          text-sm font-medium
          ${className}
        `}
        title={error?.message || 'Sync failed - click to retry'}
      >
        <AlertCircle className="w-4 h-4" />
        <span>Sync failed</span>
        <span className="text-xs text-red-500">(click to retry)</span>
      </button>
    );
  }

  // Syncing state
  if (isPending) {
    return (
      <div
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md
          text-blue-600 bg-blue-50
          text-sm font-medium
          ${className}
        `}
      >
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Syncing...</span>
        {detailed && lastSync && (
          <span className="text-xs text-blue-500">
            ({lastSync.added} new, {lastSync.updated} updated)
          </span>
        )}
      </div>
    );
  }

  // Idle state - show last sync time
  if (lastSyncTime) {
    return (
      <div
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md
          text-green-600 bg-green-50
          text-sm
          ${className}
        `}
        title={`Last synced ${formatDistanceToNow(new Date(lastSyncTime))} ago`}
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>Synced {formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}</span>
        {detailed && lastSync && (
          <span className="text-xs text-green-500">
            ({lastSync.added} added, {lastSync.updated} updated)
          </span>
        )}
      </div>
    );
  }

  // Initial load / no sync yet
  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md
        text-gray-500 bg-gray-100
        text-sm
        ${className}
      `}
    >
      <RefreshCw className="w-4 h-4" />
      <span>Waiting for first sync...</span>
    </div>
  );
}

export default SyncIndicator;
