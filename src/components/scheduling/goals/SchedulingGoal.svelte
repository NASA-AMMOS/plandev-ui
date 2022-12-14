<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import PlanIcon from '@nasa-jpl/stellar/icons/plan.svg?component';
  import CaretDownFillIcon from 'bootstrap-icons/icons/caret-down-fill.svg?component';
  import CaretRightFillIcon from 'bootstrap-icons/icons/caret-right-fill.svg?component';
  import CaretUpFillIcon from 'bootstrap-icons/icons/caret-up-fill.svg?component';
  import effects from '../../../utilities/effects';
  import { tooltip } from '../../../utilities/tooltip';
  import ContextMenu from '../../context-menu/ContextMenu.svelte';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import Input from '../../form/Input.svelte';
  import SchedulingGoalAnalysesActivities from './SchedulingGoalAnalysesActivities.svelte';
  import SchedulingGoalAnalysesBadge from './SchedulingGoalAnalysesBadge.svelte';

  export let enabled: boolean;
  export let goal: SchedulingGoal;
  export let priority: number;
  export let specificationId: number;

  $: upButtonClass = priority <= 0 ? 'hidden' : '';

  let contextMenu: ContextMenu;
  let expanded = false;
  let schedulingGoalInput: HTMLInputElement;

  function focusInput() {
    if (document.activeElement !== schedulingGoalInput) {
      schedulingGoalInput.focus();
    }

    return true;
  }

  function updatePriority(priority: number) {
    effects.updateSchedulingSpecGoal(goal.id, specificationId, { priority });
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

<div class="scheduling-goal" on:contextmenu|preventDefault={contextMenu.show}>
  <div class="left st-typography-body" class:disabled={!enabled}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <span aria-label="scheduling-goal-expand" on:click={() => (expanded = !expanded)}>
      {#if !expanded}
        <CaretRightFillIcon />
      {:else}
        <CaretDownFillIcon />
      {/if}
    </span>
    <PlanIcon />
    <span
      class="scheduling-goal-name st-typography-body"
      use:tooltip={{ content: goal.name, maxWidth: 'none', placement: 'right' }}
    >
      {goal.name}
    </span>
  </div>
  <div class="right">
    <SchedulingGoalAnalysesBadge analyses={goal.analyses} {enabled} />
    <Input>
      <input
        bind:this={schedulingGoalInput}
        bind:value={priority}
        class="st-input"
        disabled={!enabled}
        min="0"
        style:width="65px"
        type="number"
        on:change={() => updatePriority(priority)}
        on:keydown={onKeyDown}
      />
      <div class="priority-buttons">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="up-button {upButtonClass}" on:click={() => focusInput() && updatePriority(priority - 1)}>
          <CaretUpFillIcon />
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="down-button" on:click={() => focusInput() && updatePriority(priority + 1)}>
          <CaretDownFillIcon />
        </div>
      </div>
      <input
        bind:checked={enabled}
        style:cursor="pointer"
        type="checkbox"
        on:change={() => effects.updateSchedulingSpecGoal(goal.id, specificationId, { enabled })}
      />
    </Input>
  </div>
</div>

{#if expanded}
  <ul class:disabled={!enabled}>
    <li>
      <SchedulingGoalAnalysesActivities analyses={goal.analyses} />
    </li>
  </ul>
{/if}

<ContextMenu bind:this={contextMenu}>
  <ContextMenuHeader>Actions</ContextMenuHeader>
  <ContextMenuItem on:click={() => window.open(`${base}/scheduling/goals/edit/${goal.id}`, '_blank')}>
    Edit Goal
  </ContextMenuItem>
  <ContextMenuHeader>Modify</ContextMenuHeader>
  <ContextMenuItem on:click={() => effects.deleteSchedulingGoal(goal.id)}>Delete Goal</ContextMenuItem>
</ContextMenu>

<style>
  ul {
    margin: 0;
    padding-inline-start: 30px;
  }

  li {
    list-style: none;
  }

  .scheduling-goal {
    align-items: center;
    cursor: default;
    display: flex;
    font-size: 0.8rem;
    padding-bottom: 5px;
    padding-top: 5px;
  }

  .scheduling-goal-name {
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .left {
    align-items: center;
    display: flex;
    flex-grow: 1;
    gap: 10px;
    overflow: hidden;
  }

  ul.disabled *,
  ul.disabled :global(.st-typography-body),
  .left.disabled,
  .left.disabled :global(.st-typography-body) {
    color: var(--st-gray-30) !important;
  }

  .left > span:first-child {
    color: var(--st-gray-40);
    cursor: pointer;
    display: flex;
  }

  .right {
    align-items: center;
    display: flex;
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
    padding-right: 32px;
  }

  .priority-buttons {
    align-items: center;
    display: flex;
    margin-left: -32px;
  }

  .up-button,
  .down-button {
    align-items: center;
    color: var(--st-gray-40);
    cursor: pointer;
    display: flex;
    pointer-events: painted;
  }

  .up-button:hover,
  .down-button:hover {
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
