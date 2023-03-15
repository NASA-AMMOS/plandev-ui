<svelte:options immutable={true} />

<script lang="ts">
  import CaretDownIcon from '@nasa-jpl/stellar/icons/caret_down.svg?component';
  import CaretRightIcon from '@nasa-jpl/stellar/icons/caret_right.svg?component';
  import TreeLeafIcon from '@nasa-jpl/stellar/icons/tree_leaf.svg?component';
  import TreeParentCollapsedIcon from '@nasa-jpl/stellar/icons/tree_parent_collapsed.svg?component';
  import TreeParentExpandedIcon from '@nasa-jpl/stellar/icons/tree_parent_expanded.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { Span, SpanId, SpansMap, SpanUtilityMaps } from '../../types/simulation';

  export let expanded = true;
  export let rootSpanId: SpanId | null = null;
  export let selectedSpanId: SpanId | null = null;
  export let spansMap: SpansMap = {};
  export let spanUtilityMaps: SpanUtilityMaps;

  const dispatch = createEventDispatcher();

  let childIds: SpanId[] = [];
  let span: Span | null = null;

  $: span = spansMap[rootSpanId] ?? null;
  $: isRoot = span ? !span.parent_id : true;
  $: type = span?.type || '';
  $: childIds = spanUtilityMaps?.spanIdToChildIdsMap[span?.id] ?? [];
  $: hasChildren = childIds ? childIds.length > 0 : false;
  $: role = isRoot ? 'tree' : 'treeitem';
  $: nodeClass =
    'activity-decomposition-node activity-decomposition-' +
    (rootSpanId === selectedSpanId ? 'selected st-typography-medium' : 'unselected st-typography-body');
  $: buttonClass = 'st-button icon' + (!hasChildren ? ' st-button-no-hover' : '');

  function toggle() {
    expanded = !expanded;
  }
</script>

{#if !span}
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
    <span on:click={() => dispatch('select', rootSpanId)} on:dblclick={toggle} class={nodeClass}>{type}</span>
  </div>

  {#if hasChildren && expanded}
    <ul>
      {#each childIds as childId}
        <li>
          <svelte:self {spansMap} rootSpanId={spansMap[childId]?.id} {selectedSpanId} {spanUtilityMaps} on:select />
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
