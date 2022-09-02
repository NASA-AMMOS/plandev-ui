<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import PlanIcon from '@nasa-jpl/stellar/icons/svg/plan.svg?component';
  import CaretDownFillIcon from 'bootstrap-icons/icons/caret-down-fill.svg?component';
  import CaretRightFillIcon from 'bootstrap-icons/icons/caret-right-fill.svg?component';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';
  import ContextMenu from '../context-menu/ContextMenu.svelte';
  import ContextMenuHeader from '../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../context-menu/ContextMenuItem.svelte';
  import Input from '../form/Input.svelte';
  import SchedulingGoalAnalysesActivities from './SchedulingGoalAnalysesActivities.svelte';
  import SchedulingGoalAnalysesBadge from './SchedulingGoalAnalysesBadge.svelte';

  export let enabled: boolean;
  export let goal: SchedulingGoal;
  export let priority: number;
  export let specificationId: number;

  let contextMenu: ContextMenu;
  let expanded = false;
</script>

<div class="scheduling-goal" on:contextmenu|preventDefault={contextMenu.show}>
  <div class="left st-typography-body" class:disabled={!enabled}>
    <span on:click={() => (expanded = !expanded)}>
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
        bind:value={priority}
        class="st-input"
        disabled={!enabled}
        min="0"
        style:width="65px"
        type="number"
        on:change={() => effects.updateSchedulingSpecGoal(goal.id, specificationId, { priority })}
      />
      <input
        bind:checked={enabled}
        slot="right"
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
    gap: 5px;
    justify-content: flex-end;
  }
</style>
