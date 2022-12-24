<svelte:options immutable={true} />

<script lang="ts">
  import CaretDownIcon from '@nasa-jpl/stellar/icons/caret_down.svg?component';
  import CaretRightIcon from '@nasa-jpl/stellar/icons/caret_right.svg?component';
  import TreeLeafIcon from '@nasa-jpl/stellar/icons/tree_leaf.svg?component';
  import TreeParentCollapsedIcon from '@nasa-jpl/stellar/icons/tree_parent_collapsed.svg?component';
  import TreeParentExpandedIcon from '@nasa-jpl/stellar/icons/tree_parent_expanded.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { ActivitiesMap, Activity, ActivityUniqueId } from '../../types/activity';

  export let activitiesMap: ActivitiesMap = {};
  export let expanded = true;
  export let rootUniqueId: ActivityUniqueId | null = null;
  export let selectedActivityId: ActivityUniqueId | null = null;

  const dispatch = createEventDispatcher();

  let activity: Activity | null = null;
  let childUniqueIds: ActivityUniqueId[] = [];

  $: activity = activitiesMap[rootUniqueId] ?? null;
  $: isRoot = activity ? !activity.parent_id : true;
  $: type = activity?.type || '';
  $: childUniqueIds = activity?.childUniqueIds;
  $: hasChildren = childUniqueIds ? childUniqueIds.length > 0 : false;
  $: role = isRoot ? 'tree' : 'treeitem';
  $: nodeClass =
    'activity-decomposition-node activity-decomposition-' +
    (rootUniqueId === selectedActivityId ? 'selected st-typography-medium' : 'unselected st-typography-body');
  $: buttonClass = 'st-button icon' + (!hasChildren ? ' st-button-no-hover' : '');

  function toggle() {
    expanded = !expanded;
  }
</script>

{#if !activity}
  <div class="activity-decomposition activity-decomposition-not-found st-typography-medium" {role}>
    Activity not found
  </div>
{:else}
  <div class="activity-decomposition" {role}>
    <button class={buttonClass} on:click={toggle}>
      {#if isRoot}
        {#if expanded}
          <CaretDownIcon />
        {:else}
          <CaretRightIcon />
        {/if}
      {:else if hasChildren}
        {#if expanded}
          <TreeParentExpandedIcon />
        {:else}
          <TreeParentCollapsedIcon />
        {/if}
      {:else}
        <TreeLeafIcon />
      {/if}
    </button>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <span on:click={() => dispatch('selectActivity', rootUniqueId)} on:dblclick={toggle} class={nodeClass}>{type}</span>
  </div>

  {#if hasChildren && expanded}
    <ul>
      {#each childUniqueIds as childUniqueId}
        <li>
          <svelte:self
            {activitiesMap}
            rootUniqueId={activitiesMap[childUniqueId]?.uniqueId}
            {selectedActivityId}
            on:selectActivity
          />
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  ul {
    margin: 0px;
    padding-inline-start: 32px;
  }

  li {
    list-style: none;
  }

  .activity-decomposition {
    align-items: center;
    cursor: default;
    display: flex;
    height: 24px;
    position: relative;
  }

  .activity-decomposition-not-found {
    color: var(--st-red);
  }

  .activity-decomposition-unselected {
    color: var(--st-gray-60);
  }

  .activity-decomposition-selected {
    background: #e3effd;
  }

  .activity-decomposition-node {
    align-items: center;
    border-radius: 2px;
    cursor: pointer;
    display: flex;
    flex: 1;
    height: inherit;
    padding-left: 4px;
    user-select: none;
  }

  .activity-decomposition-node:hover:not(.activity-decomposition-selected) {
    background: var(--st-gray-10);
  }

  .activity-decomposition-node {
    align-items: center;
    border-radius: 2px;
    cursor: pointer;
    display: flex;
    flex: 1;
    height: inherit;
    padding-left: 4px;
    user-select: none;
  }

  .st-button-no-hover:hover {
    background: none;
    cursor: default;
  }
</style>
