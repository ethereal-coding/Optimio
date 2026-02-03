# Dashboard Rebuild Plan

## Problem Statement
Horizontal overflow in TodoWidget and CalendarWidget despite extensive min-w-0 fixes.

## Root Causes Found

### 1. Nested Grid Structure
```
Dashboard Grid (xl:grid-cols-3)
  └── Left Column (xl:col-span-2)
        └── Nested Grid (lg:grid-cols-2)  ← PROBLEM
              ├── CalendarWidget
              └── TodoWidget
```
Nested grids create circular width dependencies.

### 2. ScrollArea Component
```tsx
// Current ScrollArea - NO width constraint
<ScrollAreaPrimitive.Root className={cn("relative", className)}>
```
The Root needs `w-full min-w-0` to constrain content.

### 3. CalendarWidget Fixed Elements
```tsx
<button className="h-7 w-7 ...">  // Fixed 28px × 7 + gaps = 220px min
```
Calendar day buttons have hard minimum width.

### 4. Card Component
```tsx
// Card is flex column without min-w-0
<div className="flex flex-col gap-6 ...">
```

## Proposed Solution: Flat Grid Architecture

Replace nested grids with a single flat grid layout:

```
Dashboard Grid (responsive)
  ├── TodayOverview     (spans full width or 2 cols)
  ├── CalendarWidget    (single cell)
  ├── TodoWidget        (single cell)
  ├── GoalsWidget       (single cell)
  └── NotesWidget       (single cell)
```

### Layout Options

**Option A: Masonry-style Grid**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
  <div className="md:col-span-2"><TodayOverview /></div>
  <CalendarWidget />
  <TodoWidget />
  <GoalsWidget />
  <NotesWidget />
</div>
```

**Option B: CSS Grid Areas**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4
                [grid-template-areas:'overview_overview''calendar_todo''goals_notes']">
```

## Component Changes Required

### 1. ScrollArea Component Fix
```tsx
<ScrollAreaPrimitive.Root
  className={cn("relative w-full min-w-0", className)}  // Add w-full min-w-0
>
```

### 2. CalendarWidget - Responsive Calendar
```tsx
// Replace fixed w-7 with responsive sizing
<button className="h-7 w-full max-w-7 aspect-square ...">
// Or use CSS Grid minmax
<div className="grid grid-cols-7 gap-1 min-w-0">
```

### 3. Widget Wrapper Pattern
Each widget wrapped in constrained container:
```tsx
<div className="min-w-0 overflow-hidden">
  <Widget />
</div>
```

## Widget Interface Contract

All widgets must accept `className` prop and forward refs:

```tsx
interface WidgetProps {
  className?: string;
}

export const TodoWidget = React.forwardRef<HTMLDivElement, WidgetProps>(
  ({ className }, ref) => (
    <div ref={ref} className={cn("h-full", className)}>
      {/* Widget content */}
    </div>
  )
);
```

## Implementation Plan

### Phase 1: Infrastructure
1. Fix ScrollArea component (add w-full min-w-0)
2. Create new Dashboard layout with flat grid
3. Create widget wrapper component

### Phase 2: Widget Refactoring
4. Refactor CalendarWidget - responsive calendar grid
5. Refactor TodoWidget - simplified structure
6. Refactor GoalsWidget (if needed)
7. Refactor NotesWidget (if needed)

### Phase 3: Integration
8. Wire up new Dashboard
9. Test all screen sizes
10. Verify no overflow

## Design Principles

1. **Flat over nested** - Single grid level, no nesting
2. **Container queries** - Use @container for responsive widgets
3. **Intrinsic sizing** - Let content size naturally, constrain with min-w-0
4. **Consistent heights** - Use CSS aspect-ratio or fixed heights for cards
5. **Test data** - Verify with long titles, many items

## Verification Checklist

- [ ] No horizontal overflow at any screen size
- [ ] Calendar day buttons scale properly
- [ ] Todo filter tabs don't break layout
- [ ] All widgets same height in a row
- [ ] Mobile layout stacks correctly
- [ ] Tablet layout (md) works
- [ ] Desktop layout (xl) works
