import type { User } from './app';
import type { ModelWithOwner, PlanWithOwners } from './permissions';
import type { Workspace } from './workspace';

/**
 * Context available to commands for permission checks and execution.
 * This context is built from current application state (stores, route, etc.)
 */
export interface CommandContext {
  /** Current model (if on a model-specific page) */
  model?: ModelWithOwner | null;
  /** Current plan (if viewing a plan) */
  plan?: PlanWithOwners | null;
  /** Current route pathname */
  route: string;
  /** Current authenticated user */
  user: User | null;
  /** Current workspace (if in workspace context) */
  workspace?: Workspace | null;
}

/**
 * Categories for organizing commands in the palette UI.
 */
export type CommandCategory =
  | 'Activity'
  | 'Constraint'
  | 'Expansion'
  | 'External Source'
  | 'Model'
  | 'Navigation'
  | 'Plan'
  | 'Scheduling'
  | 'Simulation'
  | 'View'
  | 'Workspace';

/**
 * A command that can be executed from the command palette.
 * Commands wrap existing effects functions with metadata for display and permission handling.
 */
export interface Command {
  /** Category for grouping commands */
  category: CommandCategory;

  /**
   * Execute the command. This typically calls an effect function.
   */
  execute: (context: CommandContext) => Promise<void>;

  /**
   * Optional reason why the command is disabled.
   * Shown as a tooltip when the command is visible but disabled.
   */
  getDisabledReason?: (context: CommandContext) => string | null;

  /** Unique identifier for the command */
  id: string;

  /**
   * Whether this command is available in the current context.
   * Use this for page-specific commands (e.g., "Run Simulation" only on plan pages).
   * Returns true if the command should appear in the palette.
   */
  isAvailable: (context: CommandContext) => boolean;

  /**
   * Whether the user has permission to execute this command.
   * Returns true if the command can be executed.
   */
  isEnabled: (context: CommandContext) => boolean;

  /** Optional keywords for fuzzy search (beyond the label) */
  keywords?: string[];

  /** Display label shown in the palette */
  label: string;

  /** Optional keyboard shortcut hint to display */
  shortcut?: string;
}

/**
 * A command with computed enabled state and disabled reason.
 * Used by the UI after filtering and processing commands.
 */
export interface ProcessedCommand extends Command {
  disabledReason: string | null;
  enabled: boolean;
}
