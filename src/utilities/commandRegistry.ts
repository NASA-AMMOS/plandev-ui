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
import { plan as planStore } from '../stores/plan';
import type { Command, CommandContext, ProcessedCommand } from '../types/command-palette';
import type { Plan } from '../types/plan';
import effects from './effects';
import { isMacOs } from './generic';
import { featurePermissions } from './permissions';

// Route patterns for context detection
const PLAN_ROUTES = /\/plans\/\d+/;

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
    getDisabledReason: () => null,
    id: 'nav.plans',
    isAvailable: () => true,
    keywords: ['navigate', 'list', 'open'],
    label: 'Go to Plans',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/models`);
    },
    getDisabledReason: () => null,
    id: 'nav.models',
    isAvailable: () => true,
    keywords: ['navigate', 'mission', 'open'],
    label: 'Go to Models',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/constraints`);
    },
    getDisabledReason: () => null,
    id: 'nav.constraints',
    isAvailable: () => true,
    keywords: ['navigate', 'open'],
    label: 'Go to Constraints',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/scheduling`);
    },
    getDisabledReason: () => null,
    id: 'nav.scheduling',
    isAvailable: () => true,
    keywords: ['navigate', 'goals', 'conditions', 'open'],
    label: 'Go to Scheduling',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/expansion/rules`);
    },
    getDisabledReason: () => null,
    id: 'nav.expansion',
    isAvailable: () => true,
    keywords: ['navigate', 'rules', 'sets', 'open'],
    label: 'Go to Expansion',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/workspaces`);
    },
    getDisabledReason: () => null,
    id: 'nav.workspaces',
    isAvailable: () => true,
    keywords: ['navigate', 'open'],
    label: 'Go to Workspaces',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/external-sources/sources`);
    },
    getDisabledReason: () => null,
    id: 'nav.externalSources',
    isAvailable: () => true,
    keywords: ['navigate', 'events', 'open'],
    label: 'Go to External Sources',
  },
  {
    category: 'Navigation',
    execute: async () => {
      await goto(`${base}/dictionaries`);
    },
    getDisabledReason: () => null,
    id: 'nav.dictionaries',
    isAvailable: () => true,
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
      if (!featurePermissions.planBranch.canCreateBranch(user, plan, model)) {
        return 'You do not have permission to create a plan branch';
      }
      return null;
    },
    id: 'plan.createBranch',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
    keywords: ['copy', 'branch', 'clone'],
    label: 'Create Plan Branch',
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
      if (!featurePermissions.planSnapshot.canCreate(user, plan, model)) {
        return 'You do not have permission to create snapshots';
      }
      return null;
    },
    id: 'plan.createSnapshot',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
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
    getDisabledReason: ({ enableSimulation, model, plan, planReadOnly, user }) => {
      if (!plan) {
        return 'No plan selected';
      }
      if (!model) {
        return 'No model available';
      }
      if (planReadOnly) {
        return 'Plan is read-only';
      }
      if (!featurePermissions.simulation.canRun(user, plan, model)) {
        return 'You do not have permission to run simulations';
      }
      if (!enableSimulation) {
        return 'Simulation up-to-date';
      }
      return null;
    },
    id: 'simulation.run',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
    keywords: ['simulate', 'execute', 'start'],
    label: 'Run Simulation',
    shortcut: () => `${isMacOs() ? '⌘' : 'CTRL'}S`,
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
    getDisabledReason: ({ enableScheduling, model, plan, planReadOnly, user }) => {
      if (!plan) {
        return 'No plan selected';
      }
      if (!model) {
        return 'No model available';
      }
      if (planReadOnly) {
        return 'Plan is read-only';
      }
      if (!featurePermissions.schedulingGoalsPlanSpec.canRun(user, plan, model)) {
        return 'You do not have permission to run scheduling';
      }
      if (!enableScheduling) {
        return 'No scheduling goals enabled';
      }
      return null;
    },
    id: 'scheduling.run',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
    keywords: ['schedule', 'goals', 'execute'],
    label: 'Run Scheduling',
  },
  {
    category: 'Scheduling',
    execute: async ({ user }) => {
      const fullPlan = getFullPlan();
      if (fullPlan) {
        await effects.schedule(true, fullPlan, user);
      }
    },
    getDisabledReason: ({ enableScheduling, model, plan, planReadOnly, user }) => {
      if (!plan) {
        return 'No plan selected';
      }
      if (!model) {
        return 'No model available';
      }
      if (planReadOnly) {
        return 'Plan is read-only';
      }
      if (!featurePermissions.schedulingGoalsPlanSpec.canRun(user, plan, model)) {
        return 'You do not have permission to run scheduling';
      }
      if (!enableScheduling) {
        return 'No scheduling goals enabled';
      }
      return null;
    },
    id: 'scheduling.analyze',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
    keywords: ['schedule', 'goals', 'analyze'],
    label: 'Run Scheduling Analysis',
  },
  {
    category: 'Scheduling',
    execute: async () => {
      window.open(`${base}/scheduling/goals/new`, '_blank');
    },
    getDisabledReason: ({ user }) =>
      featurePermissions.schedulingGoals.canCreate(user)
        ? null
        : 'You do not have permission to create scheduling goals',
    id: 'scheduling.newGoal',
    isAvailable: () => true,
    keywords: ['create', 'add', 'goal'],
    label: 'New Scheduling Goal',
  },
  {
    category: 'Scheduling',
    execute: async () => {
      window.open(`${base}/scheduling/conditions/new`, '_blank');
    },
    getDisabledReason: ({ user }) =>
      featurePermissions.schedulingConditions.canCreate(user)
        ? null
        : 'You do not have permission to create scheduling conditions',
    id: 'scheduling.newCondition',
    isAvailable: () => true,
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
    getDisabledReason: ({ constraintsStatus, model, plan, simulationStatus, user }) => {
      if (!plan) {
        return 'No plan selected';
      }
      if (!model) {
        return 'No model available';
      }
      if (!featurePermissions.constraintRuns.canCreate(user, plan, model)) {
        return 'You do not have permission to check constraints';
      }
      if (simulationStatus !== Status.Complete) {
        return 'Completed simulation required';
      }
      if (constraintsStatus === Status.Complete) {
        return 'Constraints already checked';
      }
      return null;
    },
    id: 'constraint.check',
    isAvailable: ({ route }) => matchesRoute(route, PLAN_ROUTES),
    keywords: ['validate', 'run', 'verify'],
    label: 'Check Constraints',
  },
  {
    category: 'Constraint',
    execute: async () => {
      window.open(`${base}/constraints/new`, '_blank');
    },
    getDisabledReason: ({ user }) =>
      featurePermissions.constraints.canCreate(user) ? null : 'You do not have permission to create constraints',
    id: 'constraint.new',
    isAvailable: () => true,
    keywords: ['create', 'add'],
    label: 'New Constraint',
  },

  // ============================================
  // EXPANSION COMMANDS
  // ============================================
  {
    category: 'Expansion',
    execute: async () => {
      window.open(`${base}/expansion/rules/new`, '_blank');
    },
    getDisabledReason: ({ user }) =>
      featurePermissions.expansionRules.canCreate(user) ? null : 'You do not have permission to create expansion rules',
    id: 'expansion.newRule',
    isAvailable: () => true,
    keywords: ['create', 'add'],
    label: 'New Expansion Rule',
  },
  {
    category: 'Expansion',
    execute: async () => {
      window.open(`${base}/expansion/sets/new`, '_blank');
    },
    getDisabledReason: ({ user }) =>
      featurePermissions.expansionRules.canCreate(user) ? null : 'You do not have permission to create expansion sets',
    id: 'expansion.newSet',
    isAvailable: () => true,
    keywords: ['create', 'add'],
    label: 'New Expansion Set',
  },
];

/**
 * Get all commands filtered by availability and processed with enabled state.
 * The enabled state is derived from getDisabledReason - if null, the command is enabled.
 */
export function getAvailableCommands(context: CommandContext): ProcessedCommand[] {
  return commands
    .filter(cmd => cmd.isAvailable(context))
    .map(cmd => {
      const disabledReason = cmd.getDisabledReason(context);
      return {
        ...cmd,
        disabledReason,
        enabled: disabledReason === null,
      };
    });
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
