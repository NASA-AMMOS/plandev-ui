<svelte:options immutable={true} />

<script lang="ts">
  import CaretDownIcon from '@nasa-jpl/stellar/icons/svg/caret_down.svg?component';
  import CaretRightIcon from '@nasa-jpl/stellar/icons/svg/caret_right.svg?component';
  import TreeLeafIcon from '@nasa-jpl/stellar/icons/svg/tree_leaf.svg?component';
  import TreeParentCollapsedIcon from '@nasa-jpl/stellar/icons/svg/tree_parent_collapsed.svg?component';
  import TreeParentExpandedIcon from '@nasa-jpl/stellar/icons/svg/tree_parent_expanded.svg?component';
  import { activitiesMap, selectedActivityId } from '../../stores/activities';

  export let selected_id: number | null = null;
  export let expanded = true;
  export let id: number = 0;

  $: activity = $activitiesMap[id];
  $: isRoot = activity ? !activity.parent_id : true;
  $: type = activity?.type || '';
  $: child_ids = activity?.child_ids || null;
  $: hasChildren = child_ids ? child_ids.length > 0 : false;
  $: role = isRoot ? 'tree' : 'treeitem';
  $: nodeClass =
    'activity-decomposition-node activity-decomposition-' +
    (id === selected_id ? 'selected st-typography-medium' : 'unselected st-typography-body');
  $: buttonClass = 'st-button icon' + (!hasChildren ? ' st-button-no-hover' : '');

  function toggle() {
    expanded = !expanded;
  }
</script>

{#if !activity}
  <div class="activity-decomposition activity-decomposition-not-found st-typography-medium" {role}>
    Activity {id} not found
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
    <span on:click={() => ($selectedActivityId = id)} on:dblclick={toggle} class={nodeClass}>{type}</span>
  </div>

  {#if hasChildren && expanded}
    <ul>
      {#each child_ids as child_id}
        <li>
          <svelte:self id={$activitiesMap[child_id]?.id} {selected_id} />
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
    cursor: default;
    height: 24px;
    display: flex;
    align-items: center;
    /* gap: 4px; */
    position: relative;
  }

  .activity-decomposition-not-found {
    cursor: pointer;
    color: var(--st-red);
  }

  .activity-decomposition-unselected {
    color: var(--st-gray-60);
  }

  .activity-decomposition-selected {
    background: #e3effd;
  }

  .activity-decomposition-node {
    display: flex;
    flex: 1;
    height: inherit;
    align-items: center;
    padding-left: 4px;
    border-radius: 2px;
    cursor: pointer;
    user-select: none;
  }

  .activity-decomposition-node:hover:not(.activity-decomposition-selected) {
    background: var(--st-gray-10);
  }

  .activity-decomposition-node {
    display: flex;
    flex: 1;
    height: inherit;
    align-items: center;
    padding-left: 4px;
    border-radius: 2px;
    cursor: pointer;
    user-select: none;
  }

  .st-button-no-hover:hover {
    background: none;
    cursor: default;
  }
</style>
