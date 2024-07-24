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
  export let childPageSize: number = 25;

  const dispatch = createEventDispatcher<{
    select: number | null;
  }>();

  let childIds: SpanId[] = [];
  let span: Span | null = null;
  let childLimit = childPageSize;
  let isRoot: boolean = true;
  let type: string;
  let hasChildren: boolean = false;
  let role: 'tree' | 'treeitem' = 'tree';
  let nodeClass: string = '';
  let buttonClass: string = '';
  let childIdsInView: SpanId[] = [];

  $: span = rootSpanId !== null ? spansMap[rootSpanId] : null;
  $: isRoot = span ? !span.parent_id : true;
  $: type = span?.type || '';
  $: childIds = span !== null ? spanUtilityMaps?.spanIdToChildIdsMap[span?.span_id] || [] : [];
  $: hasChildren = childIds ? childIds.length > 0 : false;
  $: role = isRoot ? 'tree' : 'treeitem';
  $: nodeClass =
    'activity-decomposition-node activity-decomposition-' +
    (rootSpanId === selectedSpanId ? 'selected st-typography-medium' : 'unselected st-typography-body');
  $: buttonClass = 'st-button icon' + (!hasChildren ? ' st-button-no-hover' : '');
  $: childIdsInView = childIds.slice(0, childLimit);

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
    <span role="none" on:click={() => dispatch('select', rootSpanId)} on:dblclick={toggle} class={nodeClass}>
      {type}
    </span>
  </div>

  {#if hasChildren && expanded}
    <ul>
      {#each childIdsInView as childId}
        <li>
          <svelte:self
            {spansMap}
            rootSpanId={spansMap[childId]?.span_id}
            {selectedSpanId}
            {spanUtilityMaps}
            on:select
          />
        </li>
      {/each}
      {#if childIds.length !== childIdsInView.length}
        <button on:click={() => (childLimit += childPageSize)} class="st-button tertiary show-more">
          Show more ({childIds.length - childIdsInView.length})
        </button>
      {/if}
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

  .st-button.show-more {
    border-radius: 2px;
    margin-left: 20px;
  }
</style>
