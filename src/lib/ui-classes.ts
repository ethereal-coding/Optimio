/**
 * Unified UI Class Patterns
 * 
 * This file contains standardized Tailwind class combinations
 * for consistent styling across the application.
 */

// ============================================================================
// Search Input
// ============================================================================

export const searchInput = {
  /** Container for search input with icon positioning */
  container: "relative flex-1 max-w-md",
  
  /** The search icon inside the input */
  icon: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
  
  /** Base input styling - matches Todos.tsx standard */
  input: "pl-9 h-10 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-md hover:border-border-strong focus:border-border-strong hover:bg-secondary/30 transition-colors",
  
  /** Full class string for quick use */
  get inputClass() { return this.input; }
};

// ============================================================================
// Primary Action Buttons (New Task/Goal/Note/Event)
// ============================================================================

export const primaryButton = {
  /** White glass effect button for primary actions */
  base: "bg-white/75 border border-white text-neutral-950 hover:bg-white hover:border-white h-10 px-4",
  
  /** For header actions */
  header: "bg-white/85 border border-white text-neutral-950 hover:bg-white hover:border-white h-10 px-4",
  
  /** Empty state CTA */
  emptyState: "bg-white text-black hover:bg-white/90"
};

// ============================================================================
// Card Item Styles
// ============================================================================

export const cardItem = {
  /** Base card item container */
  base: "p-3 rounded-md bg-card border border-border hover:border-border-strong transition-all cursor-pointer",
  
  /** Card item with hover background change */
  hoverable: "p-3 rounded-md bg-card border border-border hover:border-border-strong hover:bg-secondary/30 transition-all cursor-pointer",
  
  /** Selected/active state */
  selected: "bg-white/75 border border-white text-neutral-950 hover:bg-white hover:border-white"
};

// ============================================================================
// Filter/Tab Buttons
// ============================================================================

export const filterButton = {
  /** Inactive filter button */
  inactive: "text-muted-foreground hover:text-foreground hover:bg-secondary",
  
  /** Active filter button (white glass) */
  active: "bg-white/75 border border-white text-neutral-950 hover:bg-white hover:text-black"
};

// ============================================================================
// Layout Patterns
// ============================================================================

export const layout = {
  /** Page header container */
  pageHeader: "border-b border-border bg-background px-6 py-4 flex-shrink-0",
  
  /** Page title row with icon */
  titleRow: "flex items-center justify-between mb-4",
  
  /** Filter/search row */
  filterRow: "flex items-center gap-3"
};

// ============================================================================
// Widget Card Styles
// ============================================================================

export const widget = {
  /** Widget card base */
  card: "bg-card border-border rounded-lg w-full h-full flex flex-col",
  
  /** Widget card header */
  header: "pb-3 flex-shrink-0",
  
  /** Widget card content area */
  content: "flex-1 overflow-hidden min-w-0"
};

// ============================================================================
// Glass Effect Variants
// ============================================================================

export const glass = {
  /** White glass button (85% opacity) */
  button85: "bg-white/85 border border-white text-neutral-950 hover:bg-white hover:border-white",
  
  /** White glass button (75% opacity) */
  button75: "bg-white/75 border border-white text-neutral-950 hover:bg-white hover:border-white",
  
  /** Colored glass badge (e.g., for priority) */
  badge: (color: string) => `bg-${color}-500/50 text-${color}-400 border border-${color}-500`,
  
  /** Vertical colored line indicator */
  line: (color: string) => ({
    base: "w-1 rounded-full border",
    style: { 
      backgroundColor: `${color}80`, // 50% opacity
      borderColor: color
    }
  })
};

// ============================================================================
// Form Input Styles
// ============================================================================

export const formInput = {
  /** Standard input */
  base: "bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-0",
  
  /** Input with hover effect */
  hoverable: "bg-card border-border text-foreground placeholder:text-muted-foreground hover:border-border-strong focus:border-border-strong transition-colors"
};

// ============================================================================
// Text Styles
// ============================================================================

export const text = {
  /** Truncated text with flex container */
  truncated: "flex-1 min-w-0 truncate",
  
  /** Widget title */
  widgetTitle: "text-sm font-medium text-foreground truncate",
  
  /** Section title (Todos, Goals, etc.) */
  sectionTitle: "text-lg font-semibold text-foreground",
  
  /** Muted/description text */
  muted: "text-xs text-muted-foreground"
};
