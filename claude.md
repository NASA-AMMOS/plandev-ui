# Aerie UI - Claude Code Guidelines

## Project Overview

Aerie UI is NASA's web-based mission planning and scheduling client application, part of the [Aerie](https://github.com/NASA-AMMOS/aerie) system developed by NASA's Advanced Multi-Mission Operations System (AMMOS). It enables mission planners, systems engineers, and spacecraft operators to create, analyze, and manage activity plans for space missions.

**Key Capabilities:**

- Activity plan creation and modification with real-time collaboration
- Discrete-event simulation visualization
- Constraint authoring and violation visualization
- Goal-oriented scheduling automation
- Command sequence generation and expansion
- Plan branching, merging, and snapshot management
- Workspace-based file management

## Tech Stack

- **Framework**: SvelteKit 2.5.4 with Svelte 4.0
- **Language**: TypeScript 5.7.3 (strict mode)
- **Build Tool**: Vite 5.4.8
- **Styling**: Tailwind CSS + NASA Stellar Design System (`@nasa-jpl/stellar-svelte`)
- **Data Grid**: AG Grid Community 32.2.0
- **Editors**: Monaco Editor 0.47, CodeMirror 6
- **Visualization**: D3.js suite
- **API**: GraphQL via Hasura with WebSocket subscriptions (graphql-ws)
- **Testing**: Vitest (unit), Playwright (e2e)
- **Node.js**: >= 18.18.0

## Project Structure

```
src/
├── routes/           # SvelteKit file-based routing (plans, workspaces, scheduling, etc.)
├── components/       # 360+ Svelte components organized by domain
│   ├── ui/          # Generic UI components (DataGrid, DatePicker, Tabs, Modal, etc.)
│   ├── activity/    # Activity directive components
│   ├── timeline/    # Timeline visualization (35+ components)
│   ├── plan/        # Plan management components
│   ├── workspace/   # Workspace file browser components
│   ├── modals/      # 46+ modal dialogs
│   ├── menus/       # Context menus and dropdowns
│   └── ...          # Other domain-specific components
├── stores/           # Svelte stores for state management (29 files)
├── utilities/        # Helper functions and services (66+ files)
│   ├── gql.ts       # GraphQL queries/mutations/subscriptions (4185 lines)
│   ├── effects.ts   # Side-effects engine for API calls (8325 lines)
│   ├── permissions.ts # Role-based access control
│   └── ...
├── types/            # TypeScript type definitions (45+ files)
├── enums/            # TypeScript enums (14 files)
├── constants/        # Application constants
├── css/              # Global styles
└── workers/          # Web Workers (TypeScript compiler)

e2e-tests/
├── tests/            # Playwright test files (32+ tests)
├── fixtures/         # Page Object Model fixtures (22+ classes)
│   ├── global.setup.auth.ts  # Auth state caching for test users
│   ├── global.setup.jar.ts   # JAR upload caching
│   └── global.teardown.ts    # Cleanup after all tests
├── utilities/
│   ├── api.ts        # AerieApi class, setupTest(), teardownTest()
│   └── ...           # Other test helpers
└── data/             # Test data files (JARs, JSONs, XMLs)
```

## Coding Conventions

### Svelte Components

1. **File Structure**: Always follow this order:

   ```svelte
   <svelte:options immutable={true} />

   <script lang="ts">
     // Imports
     // Props (export let)
     // Local state
     // Reactive declarations ($:)
     // Lifecycle hooks
     // Functions
   </script>

   <!-- Template -->

   <style>
     /* Scoped styles */
   </style>
   ```

2. **Performance**: Use `<svelte:options immutable={true} />` for components with stable props

3. **Events**: Use typed `createEventDispatcher`:

   ```typescript
   const dispatch = createEventDispatcher<{
     change: { value: string };
     submit: void;
   }>();
   ```

4. **Props**: Define with explicit types and default values:
   ```typescript
   export let className: string = '';
   export let disabled: boolean = false;
   ```

### State Management

1. **Store Types**:

   - `writable<T>()` - Mutable local state
   - `derived()` - Computed from other stores
   - `gqlSubscribable<T>()` - Real-time GraphQL subscriptions

2. **Store Usage**:

   ```typescript
   // In stores/*.ts
   export const planId = derived(plan, $plan => $plan?.id ?? -1);

   // In components
   $: currentPlanId = $planId;
   ```

3. **GraphQL Subscriptions**: Use `gqlSubscribable` from `stores/subscribable.ts`:
   ```typescript
   export const activities = gqlSubscribable<Activity[]>(
     gql.SUB_ACTIVITIES,
     { planId: planId }, // Variables can be stores
     [],
     null,
   );
   ```

### API Patterns

1. **All API calls go through `utilities/effects.ts`** - Never call `reqHasura` directly from components

2. **GraphQL queries are defined in `utilities/gql.ts`**:

   ```typescript
   // Access via gql object
   const data = await reqHasura(gql.GET_PLAN, { id: planId }, user);
   ```

3. **Error Handling**: Use `catchError` for consistent error logging:

   ```typescript
   try {
     await reqHasura(...);
   } catch (e) {
     catchError('Operation Failed', e as Error);
     showFailureToast('Operation Failed');
   }
   ```

4. **Permission Checks**: Always check before API calls:
   ```typescript
   if (!queryPermissions.CREATE_ACTIVITY_DIRECTIVE(user, plan)) {
     throwPermissionError('add a directive');
   }
   ```

### TypeScript

1. **Strict typing** - Avoid `any`, use proper generics
2. **Type definitions** go in `src/types/` organized by domain
3. **Enums** go in `src/enums/` - use for query names, routes, etc.
4. **Path aliases**: Use SvelteKit's auto-generated paths via `$lib` etc.
5. **Alphabetical ordering** - ESLint enforces sorting:

   - Object keys must be alphabetically sorted (`sort-keys` rule)
   - Class members must be alphabetically ordered (`@typescript-eslint/member-ordering`)

   ```typescript
   // Correct
   const config = {
     alpha: 1,
     beta: 2,
     gamma: 3,
   };

   // Incorrect - will fail lint
   const config = {
     gamma: 3,
     alpha: 1,
     beta: 2,
   };
   ```

### CSS/Styling

> **IMPORTANT: Stellar Transition In Progress**
>
> We are transitioning from the legacy Stellar CSS (`--st-*` CSS variables) to the new `@nasa-jpl/stellar-svelte` which provides Svelte components + Tailwind CSS integration. When refactoring or creating new components:
>
> - **Prefer** `stellar-svelte` components and Tailwind utility classes
> - **Avoid** adding new `--st-*` CSS variable usage
> - **Goal**: Remove all legacy `--st-*` styling over time

1. **Tailwind CSS** for utility classes (preferred for new code)
2. **stellar-svelte components** - Use components from `@nasa-jpl/stellar-svelte` when available
3. **Legacy CSS Variables** (`--st-*` prefix) - Existing code only, avoid in new code
4. **Scoped styles** in `<style>` block for component-specific CSS
5. **Global styles**: Use `:global(.class)` sparingly, prefer component scoping
6. **Alphabetical CSS properties** - StyleLint enforces `order/properties-alphabetical-order`:

   ```css
   /* Correct */
   .element {
     background: white;
     color: black;
     display: flex;
     padding: 8px;
   }

   /* Incorrect - will fail lint */
   .element {
     padding: 8px;
     display: flex;
     background: white;
     color: black;
   }
   ```

## Testing

### Unit Tests (Vitest)

Run with `npm run test:unit` or `npm run test:unit:coverage`

```typescript
import { cleanup, render, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi, afterEach } from 'vitest';

describe('ComponentName', () => {
  afterEach(() => cleanup());

  it('should handle user interaction', async () => {
    const { getByRole } = render(Component, { props: { ... } });
    await fireEvent.click(getByRole('button'));
    expect(getByRole('status')).toHaveTextContent('Success');
  });
});
```

### E2E Tests (Playwright)

Run with `npm run test:e2e` or `npm run test:e2e:with-ui`. To run a specific test, use `npm run test:e2e <name-of-test>` and note that playwright will do partial matches on the test name so a precise path is not always needed. Also be sure to use the correct node version to run the e2e tests as they are sensitive to this.

**Requires Aerie backend running** - See `docker-compose-test.yml`

#### API Utility for Test Setup

Use the `setupTest()` and `teardownTest()` functions from `e2e-tests/utilities/api.ts` for test setup. This provides:
- **Faster setup/teardown** via direct API calls instead of UI navigation
- **Type-safe setup results** with three levels: `BrowserSetupResult`, `ModelSetupResult`, `FullSetupResult`
- **Automatic cleanup** of created resources

```typescript
import test, { expect } from '@playwright/test';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);  // Creates model + plan via API
  await setup.plan.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);  // Cleans up plan, model, and closes browser
});

test.describe.serial('Plan Features', () => {
  test('should show plan title', async () => {
    await expect(setup.plan.planTitle).toBeVisible();
  });
});
```

#### Setup Options

The `setupTest()` function accepts options for different test needs:

```typescript
// Full setup (default) - model + plan
const setup = await setupTest(browser);  // Returns FullSetupResult

// Model only - for tests that create their own plans
const setup = await setupTest(browser, { plan: false });  // Returns ModelSetupResult

// Browser only - for tests that don't need models (tags, dictionaries)
const setup = await setupTest(browser, { model: false });  // Returns BrowserSetupResult

// Different user - for permission testing
const setup = await setupTest(browser, { user: 'userA' });  // Uses userA's auth state
```

#### AerieApi Class

For direct API access within tests, use the `AerieApi` class:

```typescript
import { AerieApi } from '../utilities/api.js';

const api = new AerieApi();
await api.login('test', 'test');

// Create resources via API
const model = await api.createModel({ jar_id: jarId, name: 'TestModel', ... });
const plan = await api.createPlan({ model_id: model.id, name: 'TestPlan', ... });
const activity = await api.createActivityDirective({ plan_id: plan.id, ... });

// Clean up via API
await api.deletePlan(plan.id);
await api.deleteModel(model.id);
```

#### Global Setup Architecture

Tests use a split global setup for better caching:
- **`global.setup.auth.ts`** - Creates and caches auth states for test users (test, userA, userB)
- **`global.setup.jar.ts`** - Uploads test JAR once and caches the ID

Use `npm run test:e2e:clear-cache` to force fresh login and JAR upload.

#### Multi-User Testing

For permission testing, use pre-authenticated users without login/logout:

```typescript
// Test with userA's permissions
const setupA = await setupTest(browser, { user: 'userA' });

// Test with userB's permissions
const setupB = await setupTest(browser, { user: 'userB' });
```

#### Role Switching

When switching roles within a test, use `gotoWithRetry()` for subsequent navigation:

```typescript
await user.switchRole('viewer');
await user.gotoWithRetry('/plans');  // Handles ERR_ABORTED errors after role change
```

**Key Test Fixtures** (Page Object Model):

- `Plan`, `Plans` - Plan management
- `Workspace`, `Workspaces` - Workspace operations
- `User` - Authentication and role switching
- `Constraints`, `SchedulingGoals`, `SchedulingConditions` - Planning features
- `Models`, `Tags`, `Dictionaries`, `Parcels` - Resource management

## Common Development Tasks

### Adding a New Feature

1. Define types in `src/types/`
2. Add GraphQL queries/mutations to `src/utilities/gql.ts`
3. Add effect functions to `src/utilities/effects.ts`
4. Create/update stores in `src/stores/`
5. Build components in `src/components/`
6. Add route if needed in `src/routes/`
7. Write unit tests alongside implementation
8. Add e2e tests in `e2e-tests/tests/`

### Running the Application

```bash
npm run dev         # Development server on port 3000
npm run build       # Production build
npm run preview     # Preview production build
npm run check       # TypeScript/Svelte type checking
npm run lint        # ESLint
npm run lint:css    # StyleLint
npm run format:write # Prettier formatting
```

### GraphQL API

- **Hasura GraphQL**: Primary API at `PUBLIC_HASURA_CLIENT_URL`
- **Gateway**: REST API at `PUBLIC_GATEWAY_CLIENT_URL` (file operations, etc.)
- **Action Server**: Custom actions at `PUBLIC_ACTION_CLIENT_URL`
- **Workspace Service**: File management at `PUBLIC_WORKSPACE_CLIENT_URL`

## Key Files to Know

- `src/utilities/gql.ts` - All GraphQL definitions
- `src/utilities/effects.ts` - All API side-effects
- `src/stores/plan.ts` - Plan state management
- `src/stores/subscribable.ts` - GraphQL subscription wrapper
- `src/utilities/permissions.ts` - RBAC permission checks
- `playwright.config.ts` - E2E test configuration
- `vite.config.js` - Build and test configuration (includes Vitest)
- `svelte.config.js` - SvelteKit configuration
- `tailwind.config.js` - Tailwind + Stellar theme
- `e2e-tests/utilities/api.ts` - E2E test API utility (setupTest, AerieApi class)
- `e2e-tests/fixtures/` - Page Object Model fixtures for E2E tests

## Environment Variables

Key variables (see `docs/ENVIRONMENT.md` for full list):

| Variable                        | Description                  |
| ------------------------------- | ---------------------------- |
| `PUBLIC_HASURA_CLIENT_URL`      | Hasura GraphQL endpoint      |
| `PUBLIC_GATEWAY_CLIENT_URL`     | Gateway REST API             |
| `PUBLIC_AUTH_SSO_ENABLED`       | Enable SSO authentication    |
| `PUBLIC_COMMAND_EXPANSION_MODE` | `typescript` or `templating` |

## Git Workflow

- **Main branch**: `develop`
- **Commit format**: `<type>: <subject>` (feat, fix, docs, refactor, test, etc.)
- **PRs**: Target `develop`, squash and merge preferred
- See `docs/CONTRIBUTING.md` for full guidelines

## External Resources

- [Aerie Documentation](https://nasa-ammos.github.io/aerie-docs/)
- [Aerie Backend](https://github.com/NASA-AMMOS/aerie)
- [NASA-AMMOS Slack](https://join.slack.com/t/nasa-ammos/shared_invite/zt-1mlgmk5c2-MgqVSyKzVRUWrXy87FNqPw) (#aerie-users)
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [AG Grid Documentation](https://www.ag-grid.com/javascript-data-grid/)
