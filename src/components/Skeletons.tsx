/**
 * Skeleton loading components
 * Show placeholder UI while data is loading
 */

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

// =============================================================================
// Event Skeletons
// =============================================================================

/**
 * Single event skeleton
 */
export function EventSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('p-4 border-b border-border last:border-b-0', className)}>
      <div className="flex items-start gap-3">
        {/* Time column */}
        <div className="flex-shrink-0 w-16 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
        </div>
        
        {/* Event content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
        </div>
        
        {/* Color indicator */}
        <div className="flex-shrink-0 w-3 h-3 bg-gray-200 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

/**
 * List of event skeletons
 */
export function EventListSkeleton({ className, count = 4 }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('divide-y divide-border', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <EventSkeleton key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// Calendar Skeleton
// =============================================================================

/**
 * Full calendar grid skeleton
 */
export function CalendarSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      
      {/* Day names */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              'aspect-square bg-gray-100 rounded animate-pulse',
              i % 7 === 0 || i % 7 === 6 ? 'bg-gray-50' : ''
            )} 
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Todo Skeletons
// =============================================================================

/**
 * Single todo skeleton
 */
export function TodoSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      {/* Checkbox */}
      <div className="flex-shrink-0 w-5 h-5 bg-gray-200 rounded animate-pulse" />
      
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
      </div>
      
      {/* Due date badge */}
      <div className="flex-shrink-0 h-5 w-16 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

/**
 * List of todo skeletons
 */
export function TodoListSkeleton({ className, count = 5 }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <TodoSkeleton key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// Goal Skeletons
// =============================================================================

/**
 * Goal card skeleton
 */
export function GoalSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('p-4 border border-border rounded-lg space-y-3', className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
        
        {/* Title and description */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
        <div className="flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-12 animate-pulse" />
        </div>
      </div>
      
      {/* Stats */}
      <div className="flex gap-4 pt-2">
        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

// =============================================================================
// Note Skeletons
// =============================================================================

/**
 * Note card skeleton
 */
export function NoteSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('p-4 border border-border rounded-lg space-y-3', className)}>
      {/* Title and date */}
      <div className="flex items-start justify-between gap-2">
        <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
      </div>
      
      {/* Content preview */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-4/6 animate-pulse" />
      </div>
      
      {/* Tags */}
      <div className="flex gap-2 pt-1">
        <div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

// =============================================================================
// Dashboard Skeleton
// =============================================================================

/**
 * Full dashboard skeleton layout
 */
export function DashboardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-border rounded-lg space-y-2">
            <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
          </div>
        ))}
      </div>
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="border border-border rounded-lg p-4">
            <EventListSkeleton count={5} />
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Todos */}
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
            <div className="border border-border rounded-lg">
              <TodoListSkeleton count={4} />
            </div>
          </div>
          
          {/* Goals */}
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
            <GoalSkeleton />
            <GoalSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Header Skeleton
// =============================================================================

/**
 * Header skeleton
 */
export function HeaderSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center justify-between h-14 px-4 border-b border-border', className)}>
      {/* Left - Logo/Nav */}
      <div className="flex items-center gap-4">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="hidden md:flex gap-2">
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      
      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden md:block h-9 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-9 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-9 w-9 bg-gray-200 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

// =============================================================================
// Generic Skeleton Elements
// =============================================================================

/**
 * Generic text skeleton
 */
export function TextSkeleton({ 
  className, 
  lines = 1,
  widths = ['full']
}: SkeletonProps & { lines?: number; widths?: ('full' | '3/4' | '2/3' | '1/2' | '1/3' | '1/4')[] }) {
  const widthClasses = {
    'full': 'w-full',
    '3/4': 'w-3/4',
    '2/3': 'w-2/3',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  };

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            'h-4 bg-gray-200 rounded animate-pulse',
            widthClasses[widths[i % widths.length]]
          )} 
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton
 */
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('p-4 border border-border rounded-lg space-y-3', className)}>
      <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
      <TextSkeleton lines={3} widths={['full', 'full', '2/3']} />
    </div>
  );
}

// =============================================================================
// Export All
// =============================================================================

export const Skeletons = {
  Event: EventSkeleton,
  EventList: EventListSkeleton,
  Calendar: CalendarSkeleton,
  Todo: TodoSkeleton,
  TodoList: TodoListSkeleton,
  Goal: GoalSkeleton,
  Note: NoteSkeleton,
  Dashboard: DashboardSkeleton,
  Header: HeaderSkeleton,
  Text: TextSkeleton,
  Card: CardSkeleton,
};

export default Skeletons;
