<svelte:options immutable={true} />

<script lang="ts">
  import { selectedGoalId } from '../../stores/scheduling';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';
  import ContextMenu from '../context-menu/ContextMenu.svelte';
  import ContextMenuHeader from '../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../context-menu/ContextMenuItem.svelte';
  import Input from '../form/Input.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import type Modal from '../modals/Modal.svelte';
  import SchedulingGoalAnalysesActivities from './SchedulingGoalAnalysesActivities.svelte';
  import SchedulingGoalAnalysesBadge from './SchedulingGoalAnalysesBadge.svelte';

  export let goal: SchedulingGoal;
  export let priority: number;

  let confirmDeleteGoalModal: Modal;
  let contextMenu: ContextMenu;
  let expanded = false;
</script>

<div class="scheduling-goal" on:contextmenu|preventDefault={e => contextMenu.show(e)}>
  <div class="left">
    <i class={expanded ? 'bi bi-caret-down-fill' : 'bi bi-caret-right-fill'} on:click={() => (expanded = !expanded)} />
    <i class="bi-calendar-range" />
    <span class="scheduling-goal-name" use:tooltip={{ content: goal.name, maxWidth: 'none', placement: 'right' }}>
      {goal.name}
    </span>
  </div>
  <div class="right">
    <SchedulingGoalAnalysesBadge analyses={goal.analyses} />
    <Input>
      <input class="st-input" disabled style:width="50px" value={priority} />
      <input checked disabled type="checkbox" slot="right" />
    </Input>
  </div>
</div>

{#if expanded}
  <ul>
    <li>
      <SchedulingGoalAnalysesActivities analyses={goal.analyses} />
    </li>
  </ul>
{/if}

<ConfirmModal
  bind:modal={confirmDeleteGoalModal}
  confirmText="Delete"
  message="Are you sure you want to delete this goal?"
  title="Delete Goal"
  on:confirm={() => effects.deleteSchedulingGoal(goal.id)}
/>

<ContextMenu bind:this={contextMenu}>
  <ContextMenuHeader>Actions</ContextMenuHeader>
  <ContextMenuItem on:click={() => ($selectedGoalId = goal.id)}>Edit Goal</ContextMenuItem>
  <ContextMenuHeader>Modify</ContextMenuHeader>
  <ContextMenuItem on:click={() => confirmDeleteGoalModal.show()}>Delete Goal</ContextMenuItem>
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
