<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import CaretDownFillIcon from 'bootstrap-icons/icons/caret-down-fill.svg?component';
  import CaretUpFillIcon from 'bootstrap-icons/icons/caret-up-fill.svg?component';
  import type { User } from '../../../types/app';
  import type { SchedulingGoalSlim } from '../../../types/scheduling';
  import effects from '../../../utilities/effects';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { tooltip } from '../../../utilities/tooltip';
  import Collapse from '../../Collapse.svelte';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import Input from '../../form/Input.svelte';
  import SchedulingGoalAnalysesActivities from './SchedulingGoalAnalysesActivities.svelte';
  import SchedulingGoalAnalysesBadge from './SchedulingGoalAnalysesBadge.svelte';

  export let enabled: boolean;
  export let goal: SchedulingGoalSlim;
  export let priority: number;
  export let specificationId: number;
  export let simulateAfter: boolean = true;
  export let user: User | null;
  export let hasGoalEditPermission: boolean = false;
  export let hasSpecEditPermission: boolean = false;
  export let hasDeletePermission: boolean = false;

  $: upButtonHidden = priority <= 0;
  $: simulateGoal = simulateAfter; // Copied to local var to reflect changed values immediately in the UI

  let schedulingGoalInput: HTMLInputElement;

  const permissionError = 'You do not have permission to edit scheduling goals for this plan.';

  function focusInput() {
    if (document.activeElement !== schedulingGoalInput) {
      schedulingGoalInput.focus();
    }

    return true;
  }

  function updatePriority(priority: number) {
    effects.updateSchedulingSpecGoal(goal.id, specificationId, { priority }, user);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'ArrowUp') {
        if (priority > 0) {
          updatePriority(priority - 1);
        }
      } else {
        updatePriority(priority + 1);
      }
    }
  }
</script>

<div class="scheduling-goal" class:disabled={!enabled}>
  <Collapse title={goal.name} tooltipContent={goal.name} defaultExpanded={false}>
    <svelte:fragment slot="right">
      <div class="right-content" role="none" on:click|stopPropagation>
        <SchedulingGoalAnalysesBadge analyses={goal.analyses} {enabled} />
        <Input>
          <input
            bind:this={schedulingGoalInput}
            bind:value={priority}
            class="st-input"
            disabled={!enabled}
            min="0"
            style:width="68px"
            type="number"
            on:change={() => updatePriority(priority)}
            on:keydown={onKeyDown}
            use:permissionHandler={{
              hasPermission: hasSpecEditPermission,
              permissionError,
            }}
          />
          {#if hasSpecEditPermission}
            <div class="priority-buttons">
              <button
                use:tooltip={{ content: 'Increase Priority', placement: 'top' }}
                class="st-button tertiary up-button"
                class:hidden={upButtonHidden}
                tabindex={upButtonHidden ? -1 : 0}
                on:click={() => focusInput() && updatePriority(priority - 1)}
              >
                <CaretUpFillIcon />
              </button>
              <button
                use:tooltip={{ content: 'Decrease Priority', placement: 'top' }}
                class="st-button tertiary down-button"
                on:click={() => focusInput() && updatePriority(priority + 1)}
              >
                <CaretDownFillIcon />
              </button>
            </div>
          {/if}
          <input
            use:tooltip={{ content: enabled ? 'Disable Scheduling Goal' : 'Enable Scheduling Goal', placement: 'top' }}
            bind:checked={enabled}
            style:cursor="pointer"
            type="checkbox"
            on:change={() => effects.updateSchedulingSpecGoal(goal.id, specificationId, { enabled }, user)}
            use:permissionHandler={{
              hasPermission: hasSpecEditPermission,
              permissionError,
            }}
          />
        </Input>
      </div>
    </svelte:fragment>

    <SchedulingGoalAnalysesActivities analyses={goal.analyses} />

    <svelte:fragment slot="contextMenuContent">
      <ContextMenuHeader>Actions</ContextMenuHeader>
      <ContextMenuItem
        on:click={() => window.open(`${base}/scheduling/goals/edit/${goal.id}`, '_blank')}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasGoalEditPermission,
              permissionError,
            },
          ],
        ]}
      >
        Edit Goal
      </ContextMenuItem>
      <ContextMenuHeader>Modify</ContextMenuHeader>
      <ContextMenuItem
        on:click={() => effects.deleteSchedulingGoal(goal, user)}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasDeletePermission,
              permissionError,
            },
          ],
        ]}
      >
        Delete Goal
      </ContextMenuItem>
      <ContextMenuItem
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasSpecEditPermission,
              permissionError,
            },
          ],
        ]}
      >
        <div
          class="scheduling-goal-simulate-toggle"
          role="none"
          on:click|stopPropagation={() => {
            simulateGoal = !simulateGoal;
            effects.updateSchedulingSpecGoal(goal.id, specificationId, { simulate_after: simulateGoal }, user);
          }}
        >
          <input bind:checked={simulateGoal} style:cursor="pointer" type="checkbox" /> Simulate After
        </div>
      </ContextMenuItem>
    </svelte:fragment>
  </Collapse>
</div>

<style>
  .scheduling-goal {
    align-items: normal;
    cursor: default;
    display: flex;
    flex-direction: column;
  }

  .scheduling-goal-simulate-toggle {
    align-items: center;
    display: flex;
  }

  .scheduling-goal-simulate-toggle input {
    margin-left: 0;
  }

  .scheduling-goal.disabled :global(*:not(.collapse-icon *):not(.context-menu *)) {
    color: var(--st-gray-30) !important;
  }

  .right-content {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  /* Hide number input "spinners" (up and down arrows) in WebKit browsers ... */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* ... and Firefox */
  input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
    padding-right: 32px;
  }

  .priority-buttons {
    align-items: center;
    display: flex;
    margin-left: -36px;
  }

  .priority-buttons :global(button) {
    align-items: center;
    color: var(--st-gray-40);
    cursor: pointer;
    display: flex;
    min-width: 0;
    padding: 0;
    pointer-events: painted;
  }

  .priority-buttons :global(button):hover {
    background-color: transparent !important;
    color: var(--st-gray-60);
  }

  .down-button {
    margin-left: -3px;
    margin-right: 2px;
  }

  .hidden {
    opacity: 0;
    pointer-events: none;
  }
</style>
