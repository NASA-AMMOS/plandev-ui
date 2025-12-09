<svelte:options immutable={true} />

<script lang="ts">
  import { page } from '$app/stores';
  import { Command } from '@nasa-jpl/stellar-svelte';
  import { Status } from '../../enums/status';
  import {
    closeCommandPalette,
    commandPaletteContext,
    commandPaletteOpen,
    toggleCommandPalette,
  } from '../../stores/commandPalette';
  import { constraintsStatus } from '../../stores/constraints';
  import { plan, planReadOnly } from '../../stores/plan';
  import { enableScheduling } from '../../stores/scheduling';
  import { enableSimulation, simulationStatus } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type { CommandContext, ProcessedCommand } from '../../types/command-palette';
  import type { Model } from '../../types/model';
  import type { Workspace } from '../../types/workspace';
  import { filterCommands, getAvailableCommands, groupCommandsByCategory } from '../../utilities/commandRegistry';

  /** Current authenticated user */
  export let user: User | null = null;

  /** Current model (optional, for model-specific pages) */
  export let model: Model | null = null;

  /** Current workspace (optional, for workspace pages) */
  export let workspace: Workspace | null = null;

  let searchValue = '';

  // Build context reactively from props and stores
  // All store values that affect command enabled state must be included here
  $: context = buildContext(
    user,
    $plan,
    model,
    workspace,
    $page.url.pathname,
    $planReadOnly,
    $simulationStatus,
    $constraintsStatus,
    $enableSimulation,
    $enableScheduling,
  );

  // Update the global context store whenever local context changes
  $: $commandPaletteContext = context;

  // Get and filter commands based on context and search
  $: allCommands = getAvailableCommands(context);
  $: filteredCommands = filterCommands(allCommands, searchValue);
  $: groupedCommands = groupCommandsByCategory(filteredCommands);

  function buildContext(
    user: User | null,
    currentPlan: typeof $plan,
    model: Model | null,
    workspace: Workspace | null,
    route: string,
    planReadOnlyValue: boolean,
    simulationStatusValue: Status | null,
    constraintsStatusValue: Status | null,
    enableSimulationValue: boolean,
    enableSchedulingValue: boolean,
  ): CommandContext {
    // Derive model from plan if not provided
    const derivedModel = model ?? (currentPlan ? { id: currentPlan.model.id, owner: currentPlan.model.owner } : null);

    return {
      constraintsStatus: constraintsStatusValue,
      enableScheduling: enableSchedulingValue,
      enableSimulation: enableSimulationValue,
      model: derivedModel,
      plan: currentPlan
        ? {
            collaborators: currentPlan.collaborators,
            id: currentPlan.id,
            model_id: currentPlan.model.id,
            owner: currentPlan.owner,
          }
        : null,
      planReadOnly: planReadOnlyValue,
      route,
      simulationStatus: simulationStatusValue,
      user,
      workspace,
    };
  }

  function handleKeydown(event: KeyboardEvent) {
    // Ctrl/Cmd + K to open command palette
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      toggleCommandPalette();
    }

    // Ctrl/Cmd + Shift + P as alternative (VS Code style)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      toggleCommandPalette();
    }
  }

  function handleSelect(command: ProcessedCommand) {
    if (!command.enabled) {
      return;
    }

    closeCommandPalette();
    try {
      // Allow palette to close before potentially opening modals that are
      // listening for enter key events
      requestAnimationFrame(() => {
        command.execute(context);
      });
    } catch (error) {
      console.error(`Command "${command.id}" failed:`, error);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      closeCommandPalette();
      searchValue = '';
    }
  }
</script>

<svelte:document on:keydown={handleKeydown} />

<Command.Dialog open={$commandPaletteOpen} onOpenChange={handleOpenChange} shouldFilter={false}>
  <Command.Input placeholder="Type a command or search..." bind:value={searchValue} />
  <Command.List>
    <Command.Empty>No commands found.</Command.Empty>
    {#each [...groupedCommands] as [category, commands]}
      <Command.Group heading={category}>
        {#each commands as command}
          <Command.Item value={command.label} onSelect={() => handleSelect(command)} disabled={!command.enabled}>
            <span>{command.label}</span>
            {#if command.disabledReason}
              <div class="ml-auto text-xs text-muted-foreground">{command.disabledReason}</div>
            {:else if command.shortcut}
              <Command.Shortcut>
                {command.shortcut()}
              </Command.Shortcut>
            {/if}
          </Command.Item>
        {/each}
      </Command.Group>
    {/each}
  </Command.List>
</Command.Dialog>

<style>
  /* Target the dialog content that contains the command palette */
  :global([data-dialog-content]:has([data-cmdk-root])) {
    max-width: 680px;
    /* Position from top instead of center to prevent jump on close */
    top: 20%;
    transform: translateX(-50%);
  }
</style>
