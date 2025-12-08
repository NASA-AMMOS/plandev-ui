/**
 * Command Registry for the Command Palette
 *
 * This module provides a centralized registry of commands that can be executed
 * from the command palette. Commands focus on navigation and actions that can be
 * performed without complex parameters.
 *
 * For actions that require user input (like creating entities), commands navigate
 * to the appropriate page where the user can complete the action.
 *
 * To add a new command:
 * 1. Import the necessary permission check from './permissions'
 * 2. Add a new Command object to the `commands` array
 * 3. Use existing `featurePermissions` for `isEnabled` to avoid duplication
 * 4. Use `isAvailable` to restrict commands to specific pages/contexts
 */

import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { get } from 'svelte/store';
import { Status } from '../enums/status';
import { constraintsStatus } from '../stores/constraints';
import { planReadOnly, plan as planStore } from '../stores/plan';
import { simulationStatus } from '../stores/simulation';
import type { Command, CommandContext, ProcessedCommand } from '../types/command-palette';
import type { Plan } from '../types/plan';
import effects from './effects';
import { featurePermissions } from './permissions';

// Route patterns for context detection
const PLAN_ROUTES = /\/plans\/\d+/;

/**
 * Helper to check if the current plan is read-only
 */
function isPlanReadOnly(): boolean {
  return get(planReadOnly);
}

/**
 * Helper to check if route matches a pattern
 */
function matchesRoute(route: string, pattern: RegExp): boolean {
  return pattern.test(route);
}

/**
 * Get the full plan from the store (needed for effects that require Plan type)
 */
function getFullPlan(): Plan | null {
  return get(planStore);
}

/**
 * All registered commands.
 * Commands are organized by category for easier maintenance.
 */
export const commands: Command[] = [
  // ============================================
  // NAVIGATION COMMANDS
  // ============================================
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/plans`);
    },
    id: 'nav.plans',
    isAvailable: () => true,
    isEnabled: () => true,
    keywords: ['navigate', 'list', 'open'],
    label: 'Go to Plans',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/models`);
    },
    id: 'nav.models',
    isAvailable: () => true,
    isEnabled: () => true,
    keywords: ['navigate', 'mission', 'open'],
    label: 'Go to Models',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/constraints`);
    },
    id: 'nav.constraints',
    isAvailable: () => true,
    isEnabled: () => true,
    keywords: ['navigate', 'open'],
    label: 'Go to Constraints',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/scheduling`);
    },
    id: 'nav.scheduling',
    isAvailable: () => true,
    isEnabled: () => true,
    keywords: ['navigate', 'goals', 'conditions', 'open'],
    label: 'Go to Scheduling',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/expansion/rules`);
    },
    id: 'nav.expansion',
    isAvailable: () => true,
    isEnabled: () => true,
    keywords: ['navigate', 'rules', 'sets', 'open'],
    label: 'Go to Expansion',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/workspaces`);
    },
    id: 'nav.workspaces',
    isAvailable: () => true,
    isEnabled: () => true,
    keywords: ['navigate', 'open'],
    label: 'Go to Workspaces',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/external-sources/sources`);
    },
    id: 'nav.externalSources',
    isAvailable: () => true,
    isEnabled: () => true,
    keywords: ['navigate', 'events', 'open'],
    label: 'Go to External Sources',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/dictionaries`);
    },
    id: 'nav.dictionaries',
    isAvailable: () => true,
    isEnabled: () => true,
    keywords: ['navigate', 'command', 'channel', 'open'],
    label: 'Go to Dictionaries',
  },

  // ============================================
  // PLAN COMMANDS
  // ============================================
  {
    category: 'Plan',
    execute: async ({ user }) => {
      const fullPlan = getFullPlan();
      if (fullPlan) {
        await effects.createPlanBranch(fullPlan, user);
      }
    },
    getDisabledReason: ({ model, plan, user }) => {
      if (!plan) {
        return 'No plan selected';
      }
      if (!model) {
        return 'No model available';
      }
      return featurePermissions.planBranch.canCreateBranch(user, plan, model)
        ? null
        : 'You do not have permission to duplicate this plan';
    },
    id: 'plan.duplicate',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
    isEnabled: ({ model, plan, user }) =>
      plan != null && model != null && featurePermissions.planBranch.canCreateBranch(user, plan, model),
    keywords: ['copy', 'branch', 'clone'],
    label: 'Duplicate Current Plan',
  },
  {
    category: 'Plan',
    execute: async ({ user }) => {
      const fullPlan = getFullPlan();
      if (fullPlan) {
        await effects.createPlanSnapshot(fullPlan, user);
      }
    },
    getDisabledReason: ({ model, plan, user }) => {
      if (!plan) {
        return 'No plan selected';
      }
      if (!model) {
        return 'No model available';
      }
      return featurePermissions.planSnapshot.canCreate(user, plan, model)
        ? null
        : 'You do not have permission to create snapshots';
    },
    id: 'plan.createSnapshot',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
    isEnabled: ({ model, plan, user }) =>
      plan != null && model != null && featurePermissions.planSnapshot.canCreate(user, plan, model),
    keywords: ['save', 'backup', 'version'],
    label: 'Create Plan Snapshot',
  },

  // ============================================
  // SIMULATION COMMANDS
  // ============================================
  {
    category: 'Simulation',
    execute: async ({ user }) => {
      const fullPlan = getFullPlan();
      if (fullPlan) {
        await effects.simulate(fullPlan, false, user);
      }
    },
    getDisabledReason: ({ model, plan, user }) => {
      if (!plan) {
        return 'No plan selected';
      }
      if (!model) {
        return 'No model available';
      }
      if (isPlanReadOnly()) {
        return 'Plan is read-only';
      }
      return featurePermissions.simulation.canRun(user, plan, model)
        ? null
        : 'You do not have permission to run simulations';
    },
    id: 'simulation.run',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
    isEnabled: ({ model, plan, user }) => {
      if (!plan || !model) {
        return false;
      }
      if (isPlanReadOnly()) {
        return false;
      }
      return featurePermissions.simulation.canRun(user, plan, model);
    },
    keywords: ['simulate', 'execute', 'start'],
    label: 'Run Simulation',
    shortcut: 'Ctrl+Shift+S',
  },

  // ============================================
  // SCHEDULING COMMANDS
  // ============================================
  {
    category: 'Scheduling',
    execute: async ({ user }) => {
      const fullPlan = getFullPlan();
      if (fullPlan) {
        await effects.schedule(false, fullPlan, user);
      }
    },
    getDisabledReason: ({ model, plan, user }) => {
      if (!plan) {
        return 'No plan selected';
      }
      if (!model) {
        return 'No model available';
      }
      if (isPlanReadOnly()) {
        return 'Plan is read-only';
      }
      return featurePermissions.schedulingGoalsPlanSpec.canRun(user, plan, model)
        ? null
        : 'You do not have permission to run scheduling';
    },
    id: 'scheduling.run',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
    isEnabled: ({ model, plan, user }) => {
      if (!plan || !model) {
        return false;
      }
      if (isPlanReadOnly()) {
        return false;
      }
      return featurePermissions.schedulingGoalsPlanSpec.canRun(user, plan, model);
    },
    keywords: ['schedule', 'goals', 'execute'],
    label: 'Run Scheduling',
  },
  {
    category: 'Scheduling',
    execute: async () => {
      await goto(`${base}/scheduling/goals/new`);
    },
    getDisabledReason: ({ user }) =>
      featurePermissions.schedulingGoals.canCreate(user)
        ? null
        : 'You do not have permission to create scheduling goals',
    id: 'scheduling.newGoal',
    isAvailable: () => true,
    isEnabled: ({ user }) => featurePermissions.schedulingGoals.canCreate(user),
    keywords: ['create', 'add', 'goal'],
    label: 'New Scheduling Goal',
  },
  {
    category: 'Scheduling',
    execute: async () => {
      await goto(`${base}/scheduling/conditions/new`);
    },
    getDisabledReason: ({ user }) =>
      featurePermissions.schedulingConditions.canCreate(user)
        ? null
        : 'You do not have permission to create scheduling conditions',
    id: 'scheduling.newCondition',
    isAvailable: () => true,
    isEnabled: ({ user }) => featurePermissions.schedulingConditions.canCreate(user),
    keywords: ['create', 'add', 'condition'],
    label: 'New Scheduling Condition',
  },

  // ============================================
  // CONSTRAINT COMMANDS
  // ============================================
  {
    category: 'Constraint',
    execute: async ({ user }) => {
      const fullPlan = getFullPlan();
      if (fullPlan) {
        await effects.checkConstraints(fullPlan, user, false);
      }
    },
    getDisabledReason: ({ model, plan, user }) => {
      if (!plan) {
        return 'No plan selected';
      }
      if (!model) {
        return 'No model available';
      }
      if (!featurePermissions.constraintRuns.canCreate(user, plan, model)) {
        return 'You do not have permission to check constraints';
      }

      const simStatus = get(simulationStatus);
      const constStatus = get(constraintsStatus);

      if (simStatus !== Status.Complete) {
        return 'Completed simulation required';
      }
      if (constStatus === Status.Complete) {
        return 'Constraints already checked';
      }

      return null;
    },
    id: 'constraint.check',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
    isEnabled: ({ model, plan, user }) => {
      if (!plan || !model) {
        return false;
      }
      if (!featurePermissions.constraintRuns.canCreate(user, plan, model)) {
        return false;
      }

      const simStatus = get(simulationStatus);
      const constStatus = get(constraintsStatus);

      // Disable if simulation is not complete
      if (simStatus !== Status.Complete) {
        return false;
      }

      // Disable if constraints are already complete (no need to re-run)
      if (constStatus === Status.Complete) {
        return false;
      }

      return true;
    },
    keywords: ['validate', 'run', 'verify'],
    label: 'Check Constraints',
  },
  {
    category: 'Constraint',
    execute: async () => {
      await goto(`${base}/constraints/new`);
    },
    getDisabledReason: ({ user }) =>
      featurePermissions.constraints.canCreate(user) ? null : 'You do not have permission to create constraints',
    id: 'constraint.new',
    isAvailable: () => true,
    isEnabled: ({ user }) => featurePermissions.constraints.canCreate(user),
    keywords: ['create', 'add'],
    label: 'New Constraint',
  },

  // ============================================
  // EXPANSION COMMANDS
  // ============================================
  {
    category: 'Expansion',
    execute: async () => {
      await goto(`${base}/expansion/rules/new`);
    },
    getDisabledReason: ({ user }) =>
      featurePermissions.expansionRules.canCreate(user) ? null : 'You do not have permission to create expansion rules',
    id: 'expansion.newRule',
    isAvailable: () => true,
    isEnabled: ({ user }) => featurePermissions.expansionRules.canCreate(user),
    keywords: ['create', 'add'],
    label: 'New Expansion Rule',
  },
  {
    category: 'Expansion',
    execute: async () => {
      await goto(`${base}/expansion/sets/new`);
    },
    getDisabledReason: ({ user }) =>
      featurePermissions.expansionRules.canCreate(user) ? null : 'You do not have permission to create expansion sets',
    id: 'expansion.newSet',
    isAvailable: () => true,
    isEnabled: ({ user }) => featurePermissions.expansionRules.canCreate(user),
    keywords: ['create', 'add'],
    label: 'New Expansion Set',
  },
];

/**
 * Get all commands filtered by availability and processed with enabled state.
 */
export function getAvailableCommands(context: CommandContext): ProcessedCommand[] {
  return commands
    .filter(cmd => cmd.isAvailable(context))
    .map(cmd => ({
      ...cmd,
      disabledReason: cmd.getDisabledReason?.(context) ?? null,
      enabled: cmd.isEnabled(context),
    }));
}

/**
 * Get a command by its ID.
 */
export function getCommandById(id: string): Command | undefined {
  return commands.find(cmd => cmd.id === id);
}

/**
 * Filter commands by search query (matches label and keywords).
 */
export function filterCommands(commands: ProcessedCommand[], query: string): ProcessedCommand[] {
  if (!query.trim()) {
    return commands;
  }

  const lowerQuery = query.toLowerCase();
  return commands.filter(cmd => {
    const labelMatch = cmd.label.toLowerCase().includes(lowerQuery);
    const keywordMatch = cmd.keywords?.some(kw => kw.toLowerCase().includes(lowerQuery)) ?? false;
    const categoryMatch = cmd.category.toLowerCase().includes(lowerQuery);
    return labelMatch || keywordMatch || categoryMatch;
  });
}

/**
 * Group commands by category.
 */
export function groupCommandsByCategory(commands: ProcessedCommand[]): Map<string, ProcessedCommand[]> {
  const groups = new Map<string, ProcessedCommand[]>();

  for (const cmd of commands) {
    const existing = groups.get(cmd.category) ?? [];
    existing.push(cmd);
    groups.set(cmd.category, existing);
  }

  return groups;
}
