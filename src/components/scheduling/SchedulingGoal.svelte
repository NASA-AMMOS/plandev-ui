<svelte:options immutable={true} />

<script lang="ts">
  import SchedulingGoalAnalysesActivities from './SchedulingGoalAnalysesActivities.svelte';
  import SchedulingGoalAnalysesBadge from './SchedulingGoalAnalysesBadge.svelte';
  import ContextMenu from '../context-menu/ContextMenu.svelte';
  import ContextMenuHeader from '../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../context-menu/ContextMenuItem.svelte';
  import Input from '../form/Input.svelte';
  import ConfirmModal from '../modals/Confirm.svelte';
  import { schedulingPanelEditor } from '../../stores/panels';
  import { deleteSchedulingGoal } from '../../stores/scheduling';

  export let goal: SchedulingGoal;
  export let priority: number;

  let confirmDeleteGoalModal: ConfirmModal;
  let contextMenu: ContextMenu;
  let expanded = false;

  function onConfirmDeleteGoal() {
    deleteSchedulingGoal(goal.id);
  }

  function onOpenContextMenu(event: MouseEvent) {
    contextMenu.show(event);
  }
</script>

<div class="scheduling-goal" on:contextmenu|preventDefault={onOpenContextMenu}>
  <div class="left">
    <i
      class={expanded ? 'bi bi-caret-down-fill' : 'bi bi-caret-right-fill'}
      on:click={() => (expanded = !expanded)}
    />
    <i class="bi-calendar-range" />
    {goal.name}
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
  bind:this={confirmDeleteGoalModal}
  confirmText="Delete"
  message="Are you sure you want to delete this goal?"
  title="Delete Goal"
  on:confirm={onConfirmDeleteGoal}
/>

<ContextMenu bind:this={contextMenu}>
  <ContextMenuHeader>Actions</ContextMenuHeader>
  <ContextMenuItem on:click={() => ($schedulingPanelEditor = true)}>
    Edit Goal
  </ContextMenuItem>
  <ContextMenuHeader>Modify</ContextMenuHeader>
  <ContextMenuItem on:click={() => confirmDeleteGoalModal.show()}>
    Delete Goal
  </ContextMenuItem>
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

  .left {
    align-items: center;
    display: flex;
    flex-grow: 1;
    gap: 10px;
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
