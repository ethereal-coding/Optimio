import { cn } from './utils';

// =============================================================================
// INPUT STYLES
// =============================================================================

/** Base input styling - dark background with border */
export const inputBase = 'bg-card border-border text-foreground placeholder:text-muted-foreground';

/** Input focus and hover states */
export const inputFocusStates = 'hover:border-border-strong focus:border-border-strong hover:bg-secondary/20 transition-colors shadow-none';

/** Input size variants */
export const inputSize = {
  sm: 'h-8 text-sm',
  md: 'h-9 text-sm', 
  lg: 'h-10 text-sm',
};

/** Input border radius variants */
export const inputRadius = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/** 
 * Complete search input class string
 * @param size - Size variant (sm, md, lg)
 * @param radius - Border radius variant (sm, md, lg, full)
 */
export function searchInputClasses(
  size: 'sm' | 'md' | 'lg' = 'lg',
  radius: 'sm' | 'md' | 'lg' | 'full' = 'md'
): string {
  return cn(
    inputBase,
    inputFocusStates,
    inputSize[size],
    inputRadius[radius],
    'pl-9' // Space for search icon
  );
}

/** 
 * Standard text input classes
 * @param size - Size variant (sm, md, lg)
 * @param radius - Border radius variant (sm, md, lg, full)
 */
export function textInputClasses(
  size: 'sm' | 'md' | 'lg' = 'md',
  radius: 'sm' | 'md' | 'lg' | 'full' = 'md'
): string {
  return cn(
    inputBase,
    inputFocusStates,
    inputSize[size],
    inputRadius[radius]
  );
}

// =============================================================================
// BUTTON STYLES
// =============================================================================

/** Primary white glass button style */
export const buttonPrimary = 'bg-white/85 border border-white text-neutral-950 hover:bg-white hover:border-white';

/** Secondary/outline button style */
export const buttonSecondary = 'bg-transparent border-border text-foreground hover:bg-secondary hover:border-border-strong';

/** Ghost button style */
export const buttonGhost = 'bg-transparent border-transparent text-foreground hover:bg-secondary';

/** Danger/destructive button style */
export const buttonDanger = 'bg-destructive border-destructive text-destructive-foreground hover:bg-destructive/90';

/** Empty state button style (solid white for emphasis) */
export const buttonEmptyState = 'bg-white text-black hover:bg-white/90';

// =============================================================================
// CARD STYLES
// =============================================================================

/** Standard card background with opacity for layering */
export const cardBg = 'bg-card/80 border-border/80';

/** Card item/card styling */
export const cardItem = 'bg-card border-border hover:border-border-strong transition-colors';

/** Card hover effect */
export const cardHover = 'hover:bg-secondary/20 hover:border-border-strong transition-colors';

/** Card with 80% opacity background */
export const cardMuted = 'bg-[#1a1a1a]/80 border-[#1a1a1a]/80';

// =============================================================================
// TYPOGRAPHY
// =============================================================================

/** Muted/secondary text color */
export const textMuted = 'text-muted-foreground';

/** Primary text color */
export const textPrimary = 'text-foreground';

/** Text truncation with ellipsis */
export const textTruncate = 'truncate';

/** Multi-line text clamp */
export const textClamp = (lines: number): string => `line-clamp-${lines}`;

// =============================================================================
// SCROLL AREA
// =============================================================================

/** Standard scroll area padding */
export const scrollAreaPadding = 'pr-3';

/** Scroll area with custom scrollbar */
export const scrollAreaCustom = 'scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent';

// =============================================================================
// SEARCH INPUT WRAPPER
// =============================================================================

/** Standard search input wrapper with icon positioning */
export const searchInputWrapper = 'relative flex-1 max-w-md';

/** Search icon positioning classes */
export const searchIconClasses = 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none';

// =============================================================================
// BADGE STYLES
// =============================================================================

/** Standard badge background */
export const badgeBg = 'bg-secondary border-border';

/** Active/selected badge background */
export const badgeActive = 'bg-primary/10 border-primary/20 text-primary';

// =============================================================================
// FORM ELEMENTS
// =============================================================================

/** Form label styling */
export const formLabel = 'text-sm font-medium text-foreground';

/** Form description/help text */
export const formDescription = 'text-xs text-muted-foreground';

/** Form error message */
export const formError = 'text-xs text-destructive';

/** Required field indicator */
export const requiredIndicator = 'text-destructive';

// =============================================================================
// WIDGET CARD SPACING STANDARDS
// =============================================================================

/** Widget CardHeader - consistent padding and shrink behavior */
export const widgetHeader = 'pb-3 flex-shrink-0';

/** Widget CardContent - consistent flex and overflow behavior */
export const widgetContent = 'flex-1 overflow-hidden min-w-0';

/** Widget ScrollArea - consistent height and padding */
export const widgetScrollArea = 'h-full w-full pr-3';

/** Widget inner container padding */
export const widgetInnerPadding = 'pb-2';

/** Widget items container spacing */
export const widgetItemsGap = 'space-y-2';

/** Widget item card styling - padding, border, hover, gap */
export const widgetItemCard = 'p-3 rounded-md bg-card border border-border hover:border-border-strong hover:bg-secondary/30 transition-all cursor-pointer flex flex-col gap-2';

/** Widget item title text */
export const widgetItemTitle = 'text-sm font-medium text-foreground truncate';

/** Widget item meta row - small text with border top */
export const widgetItemMeta = 'flex items-center justify-between gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50 mt-auto';

/** Widget section label (Pinned, Recent, etc.) */
export const widgetSectionLabel = 'text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1';
