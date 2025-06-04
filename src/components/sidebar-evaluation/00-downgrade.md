# Sidebar Component Svelte 5 → Svelte 4 Conversion Plan

## Overview

This document outlines the complete plan for converting the shadcn-svelte sidebar component from Svelte 5 to Svelte 4 syntax and patterns.

**Simplified Scope:** Desktop-only implementation using existing stellar components.

## ✅ **COMPLETED: Foundation Setup**

### Utility Functions ✅

- [x] **`cn()` function** - Added to `src/utilities/generic.ts`
- [x] **`WithElementRef` type** - Added to `src/types/component.ts`
- [x] **CSS Variables** - Added to `src/css/app.css`
- [x] **Existing `classNames()` function** - Available for backward compatibility

### Dependencies ✅

- [x] **Sheet Component** - `import { Sheet } from '@nasa-jpl/stellar-svelte';`
- [x] **Tooltip Provider** - `import { Tooltip } from '@nasa-jpl/stellar-svelte';`

## Major Svelte 5 Features to Convert

### 1. Reactive State Management

**Current (Svelte 5):**

- `$state()` for reactive variables
- `$derived.by()` for computed values
- Class-based reactivity

**Required Changes:**

- Convert to Svelte stores (`writable`, `readable`, `derived`)
- Refactor `SidebarState` class to use stores instead of class reactivity
- Update all reactive references to use store subscriptions
- **Simplified:** Remove mobile state management entirely

### 2. Props Syntax

**Current (Svelte 5):**

```typescript
let { ref = $bindable(null), open = $bindable(true), ... } = $props();
```

**Required Changes:**

- Convert to `export let` declarations
- Implement manual two-way binding for `$bindable` props
- Use `createEventDispatcher` for prop updates

### 3. Snippet Rendering

**Current (Svelte 5):**

```svelte
{@render children?.()}
```

**Required Changes:**

- Replace with `<slot></slot>` syntax
- Update component composition patterns

## File-by-File Conversion Plan

### ✅ Phase 1: Core State Management

#### `context.svelte.ts` → `context.ts`

- [ ] Convert `SidebarState` class from Svelte 5 reactivity to store-based
- [ ] Replace `$derived.by()` with `derived()` stores for computed values
- [ ] Update getter functions to return store values
- [ ] Maintain the same public API for `setSidebar()` and `useSidebar()`
- [ ] **Simplified:** Remove all mobile-related state and methods

**Import Strategy:**

```typescript
// New imports for converted components
import { cn } from '../utilities/generic';
import type { WithElementRef } from '../types/component';
import { Sheet, Tooltip } from '@nasa-jpl/stellar-svelte';
```

### Phase 2: Component Conversion

#### `sidebar-provider.svelte`

- [ ] Convert `$props()` to `export let` declarations
- [ ] Replace `$bindable(true)` with manual prop binding
- [ ] Update `onOpenChange` to use `createEventDispatcher`
- [ ] Ensure cookie handling remains functional
- [ ] Convert window keydown handler binding
- [ ] **Updated:** Use `import { Tooltip } from '@nasa-jpl/stellar-svelte';`

#### `sidebar.svelte` (Main Component)

- [ ] Convert props from `$props()` to `export let`
- [ ] Replace `{@render children?.()}` with `<slot></slot>`
- [ ] Update `useSidebar()` to work with store-based context
- [ ] Update data attributes and class bindings
- [ ] **Remove:** All mobile Sheet.Root implementation - keep only desktop sidebar
- [ ] **Updated:** Use new `cn()` utility function

#### Sub-components (22 files total)

For each component file, convert:

- [ ] `sidebar-content.svelte` - Props and slots
- [ ] `sidebar-footer.svelte` - Props and slots
- [ ] `sidebar-group-action.svelte` - Props and event handling
- [ ] `sidebar-group-content.svelte` - Props and slots
- [ ] `sidebar-group-label.svelte` - Props and slots
- [ ] `sidebar-group.svelte` - Props and slots
- [ ] `sidebar-header.svelte` - Props and slots
- [ ] `sidebar-input.svelte` - Props and form binding
- [ ] `sidebar-inset.svelte` - Props and slots
- [ ] `sidebar-menu-action.svelte` - Props and event handling
- [ ] `sidebar-menu-badge.svelte` - Props and styling
- [ ] `sidebar-menu-button.svelte` - Props and interaction logic
- [ ] `sidebar-menu-item.svelte` - Props and slots
- [ ] `sidebar-menu-skeleton.svelte` - Props and styling
- [ ] `sidebar-menu-sub-button.svelte` - Props and interaction
- [ ] `sidebar-menu-sub-item.svelte` - Props and slots
- [ ] `sidebar-menu-sub.svelte` - Props and slots
- [ ] `sidebar-menu.svelte` - Props and slots
- [ ] `sidebar-rail.svelte` - Props and interaction logic
- [ ] `sidebar-separator.svelte` - Props and styling
- [ ] `sidebar-trigger.svelte` - Props and event handling

**Conversion Pattern for Each Component:**

```svelte
<!-- FROM (Svelte 5) -->
<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<div class={cn("base-classes", className)} bind:this={ref} {...restProps}>
  {@render children?.()}
</div>

<!-- TO (Svelte 4) -->
<script lang="ts">
  import { cn } from '../utilities/generic';
  import type { WithElementRef } from '../types/component';
  import type { HTMLAttributes } from 'svelte/elements';

  export let ref: HTMLElement | null = null;
  export let className: string = '';
  // Handle other props as needed
</script>

<div class={cn("base-classes", className)} bind:this={ref}>
  <slot></slot>
</div>
```

### ✅ Phase 3: External Dependencies - COMPLETED

#### Available Components:

- [x] **Sheet Component** - `import { Sheet } from '@nasa-jpl/stellar-svelte';`
- [x] **Tooltip Provider** - `import { Tooltip } from '@nasa-jpl/stellar-svelte';`
- [x] **`cn()` function** - Available in `src/utilities/generic.ts`
- [x] **`WithElementRef` type** - Available in `src/types/component.ts`

### Phase 4: Styling and Constants

#### `constants.ts`

- [ ] Verify all constants are compatible (no changes likely needed)
- [ ] **Remove:** `SIDEBAR_WIDTH_MOBILE` references (desktop only)
- [ ] Ensure CSS custom properties work with existing setup

#### ✅ CSS Variables and Styling - COMPLETED:

- [x] `--sidebar-*` custom properties added to `src/css/app.css`
- [x] Both light and dark mode variables configured
- [x] Tailwind classes compatibility verified

### Phase 5: Type Definitions

#### `index.ts`

- [ ] Update type exports for Svelte 4 compatibility
- [ ] Ensure TypeScript definitions match new prop patterns
- [ ] Update component interface definitions
- [ ] Export new utilities: `cn`, `WithElementRef`

## Implementation Strategy

### ✅ Step 1: Setup Development Environment - COMPLETED

- [x] CSS variables added to app.css
- [x] Utility functions (`cn()`, `WithElementRef`) created
- [x] Confirmed stellar component availability

### Step 2: Core State Management

- [ ] Convert `context.svelte.ts` to store-based pattern
- [ ] **Simplified:** Remove mobile state management
- [ ] Create comprehensive tests for state management
- [ ] Ensure backward compatibility with existing patterns

### Step 3: Component Conversion (Bottom-up)

- [ ] Start with leaf components (no children)
- [ ] Work up to container components
- [ ] Convert main sidebar and provider last
- [ ] Test each component individually
- [ ] **Simplified:** Skip mobile-specific components/logic

### Step 4: Integration and Testing

- [ ] Create comprehensive test suite
- [ ] **Desktop only:** Test keyboard shortcuts and state persistence
- [ ] Verify keyboard shortcuts work (`Cmd/Ctrl + B`)
- [ ] Test state persistence (cookies)
- [ ] Validate accessibility features

## Key Conversion Patterns

### 1. Props Conversion

```typescript
// Svelte 5
let { ref = $bindable(null), open = $bindable(true), ...restProps } = $props();

// Svelte 4
export let ref: HTMLElement | null = null;
export let open: boolean = true;

const dispatch = createEventDispatcher<{ openChange: boolean }>();
$: dispatch('openChange', open);
```

### 2. Snippet to Slot Conversion

```svelte
<!-- Svelte 5 -->
{@render children?.()}

<!-- Svelte 4 -->
<slot></slot>
```

### 3. Class Name Handling

```typescript
// Now using our cn() function
import { cn } from '../utilities/generic';

class={cn("base-classes", className)}
```

### 4. Store-based State Management

```typescript
// Convert from Svelte 5 class reactivity to stores
import { writable, derived } from 'svelte/store';

const sidebarState = writable({
  open: true,
  collapsible: 'offcanvas' as const,
});
```

## Updated Timeline ⚡

- **✅ Phase 0** (Foundation): **COMPLETED** - 0 days
- **Phase 1** (Core State): 1 day (simplified without mobile)
- **Phase 2** (Components): 3-4 days
- **Phase 3** (Dependencies): **COMPLETED** - 0 days
- **Phase 4** (Styling): 0.5 days (mostly done)
- **Phase 5** (Types): 0.5 days
- **Testing & Polish**: 1-2 days

**Total Estimated Time:** **5-7 days** (reduced from original 12-16 days)

## Success Metrics

- [ ] All 25 component files successfully converted
- [ ] No Svelte 5 syntax remains
- [ ] Full functionality preserved (desktop only)
- [ ] TypeScript support maintained
- [ ] Performance equivalent or better
- [ ] Accessibility standards met
- [ ] Integration with existing stellar components seamless
- [x] Foundation utilities (`cn()`, `WithElementRef`, CSS vars) ready
- [x] Import strategy defined and validated

## Next Steps

1. **Start with context conversion** - Convert `context.svelte.ts` to store-based pattern
2. **Create simple test component** - Validate the conversion approach works
3. **Convert components bottom-up** - Start with simple leaf components
4. **Test integration** - Ensure stellar components work correctly
5. **Final integration** - Hook into existing app layout
