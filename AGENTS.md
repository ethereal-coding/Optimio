# Optimio CRM - Agent Context

## Workflow Orchestration

### 1. Plan Mode Default

Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)

If something goes sideways, STOP and re-plan immediately don't keep pushing

Use plan mode for verification steps, not just building

Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

Use subagents liberally to keep main context window clean

Offload research, exploration, and parallel analysis to subagents

For complex problems, throw more compute at it via subagents

One task per subagent for focused execution

### 3. Self-Improvement Loop

After ANY correction from the user: update tasks/lessons.md with the pattern

Write rules for yourself that prevent the same mistake

Ruthlessly iterate on these lessons until mistake rate drops

Review lessons at session start for relevant project

### 4. Verification Before Done

Never mark a task complete without proving it works

Diff behavior between main and your changes when relevant

Ask yourself: "Would a staff engineer approve this?"

Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

For non-trivial changes: pause and ask "is there a more elegant way?"

If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"

Skip this for simple, obvious fixes don't over-engineer

Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

When given a bug report: just fix it. Don't ask for hand-holding

Point at logs, errors, failing tests then resolve them

Zero context switching required from the user

Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to tasks/todo.md with checkable items

2. **Verify Plan**: Check in before starting implementation

3. **Track Progress**: Mark items complete as you go

4. **Explain Changes**: High-level summary at each step

5. **Document Results**: Add review section to tasks/todo.md

6. **Capture Lessons**: Update tasks/lessons.md after corrections

## Core Principles

**Simplicity First**: Make every change as simple as possible. Impact minimal code.

**No Laziness**: Find root causes. No temporary fixes. Senior developer standards.

**Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Git Workflow (CRITICAL)

### Commit After Every Incremental Update

**NEVER** go more than 10-15 minutes or one logical change without committing.

**Rule**: If you pause to think "should I commit?" - the answer is YES.

### Commit Message Format

```
<type>(<scope>): <description>

<body> (optional but encouraged)

Refs: #<issue-number> (if applicable)
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring, no behavior change
- `style` - Formatting, missing semicolons, etc
- `docs` - Documentation changes
- `test` - Adding/updating tests
- `chore` - Build process, deps, tooling

**Examples:**
```
fix(scroll-area): prevent horizontal overflow with table-fixed layout

Radix UI ScrollArea uses display:table which expands beyond container.
Adding table-fixed and w-full constraints forces proper width.

Refs: #42
```

```
feat(dashboard): add responsive 2-row layout

- TodayOverview + Tasks in first row (520px)
- Notes + Goals + Calendar in second row (450px)
- Responsive breakpoints for tablet/mobile
```

### Commit Checklist

Before every commit:
- [ ] `git diff` reviewed - I know exactly what changed
- [ ] Build passes (`npm run build` or `tsc --noEmit`)
- [ ] No console errors introduced
- [ ] Commit message describes WHY not just WHAT
- [ ] Scope is focused (one logical change per commit)

### Post-Commit Verification

After committing:
```bash
# Verify commit
git log --oneline -1

# Check status - should be clean
git status
```

### When User Says "Thanks" or "Good"

That's a completion signal. COMMIT IMMEDIATELY:
```bash
git add .
git commit -m "feat(scope): description of what just worked"
```

### Recovery Strategy

If you forget to commit and make more changes:
```bash
# Check what's not committed
git diff

# Stage and commit ONLY the completed work
git add -p  # interactive staging
git commit -m "fix: description of first fix"

# Then commit remaining changes separately
git add .
git commit -m "fix: description of subsequent changes"
```

## Persistent Issues

### Horizontal Overflow in Dashboard Widgets - FIXED ✅
**Status**: Resolved  
**Root Cause**: Radix UI ScrollArea Viewport uses `display: table` with `min-width: 100%` which prevents shrinking  
**Solution**: Added `[&>div]:!min-w-0 [&>div]:w-full [&>div]:table-fixed` to ScrollArea Viewport className

**Files Modified**:
- `src/components/ui/scroll-area.tsx` - Fixed viewport constraints
- `src/sections/Dashboard.tsx` - Flat grid layout
- `src/components/CalendarWidget.tsx` - Containment classes
- `src/components/TodoWidget.tsx` - Containment classes

## Project Structure

### Tech Stack
- React 19 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Key Directories
- `/src/components` - Widgets and UI components
- `/src/sections` - Page sections (Dashboard, etc.)
- `/src/hooks` - Custom hooks including useAppState

### Styling Standards
- Dark-first theme with bg-card (#121212) backgrounds
- Blueberry primary color (#5484ed)
- Card border radius: rounded-lg
- All card items use: bg-card, border-border, hover:border-border-strong
- Text truncation: always use `truncate` + `flex-1 min-w-0` wrapper

## Common Patterns

### Widget Card Structure
```tsx
<Card className="bg-card border-border rounded-lg w-full">
  <CardHeader className="pb-3">
    {/* Title row with icon + actions */}
  </CardHeader>
  <CardContent>
    <ScrollArea className="h-[300px] pr-3">
      <div className="pb-2">
        {/* Content items */}
      </div>
    </ScrollArea>
  </CardContent>
</Card>
```

### Card Item with Truncated Title
```tsx
<div className="p-3 rounded-md bg-card border border-border flex items-center gap-3 min-w-0 overflow-hidden">
  <Checkbox />
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 min-w-0">
      <span className="h-2 w-2 rounded-full flex-shrink-0" />
      <p className="text-sm truncate">{title}</p>
    </div>
  </div>
</div>
```

## Dashboard Layout

```tsx
<main className="flex-1 overflow-auto custom-scrollbar p-4 min-w-0">
  <div className="max-w-[1600px] mx-auto space-y-4 min-w-0">
    <QuickStats />
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-w-0">
      {/* Left Column */}
      <div className="xl:col-span-2 space-y-4 min-w-0 max-w-full">
        <TodayOverview />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
          <CalendarWidget />
          <TodoWidget />
        </div>
      </div>
      {/* Right Column */}
      <div className="xl:col-span-1 space-y-4 min-w-0 max-w-full">
        <GoalsWidget />
        <NotesWidget />
      </div>
    </div>
  </div>
</main>
```
