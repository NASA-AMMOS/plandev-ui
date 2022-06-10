<svelte:options immutable={true} />

<script lang="ts">
  import { selectedGoalId } from '../../stores/scheduling';
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

<div class="scheduling-goal" on:contextmenu|preventDefault={e => contextMenu.show(e)}>
  <div class="left" class:disabled={!enabled}>
    <i class={expanded ? 'bi bi-caret-down-fill' : 'bi bi-caret-right-fill'} on:click={() => (expanded = !expanded)} />
    <i class="bi-calendar-range" />
    <span class="scheduling-goal-name" use:tooltip={{ content: goal.name, maxWidth: 'none', placement: 'right' }}>
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
  <ContextMenuItem on:click={() => ($selectedGoalId = goal.id)}>Edit Goal</ContextMenuItem>
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
  .left.disabled {
    color: var(--st-gray-30);
  }

  .left > i:first-child {
    color: var(--st-gray-40);
    cursor: pointer;
  }

  .right {
    align-items: center;
    display: flex;
    gap: 5px;
    justify-content: flex-end;
  }
</style>
