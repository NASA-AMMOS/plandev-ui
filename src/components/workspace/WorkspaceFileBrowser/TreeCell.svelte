<svelte:options immutable={true} />

<script lang="ts">
  import { ChevronDown, ChevronRight } from 'lucide-svelte';
  import type { WorkspaceTreeNodeWithFullPath } from '../../../types/workspace-tree-view';
  import WorkspaceTreeViewIcon from '../WorkspaceTreeView/WorkspaceTreeViewIcon.svelte';

  /** Pixels of indentation per depth level */
  const INDENT_SIZE_PX = 12;

  export let data: WorkspaceTreeNodeWithFullPath | undefined = undefined;
  export let isExpanded: boolean = false;
  export let onToggleExpand: ((path: string) => void) | undefined = undefined;
</script>

<div class="tree-cell" style:padding-left="{(data?.depth ?? 0) * INDENT_SIZE_PX}px">
  <span class="tree-chevron">
    {#if data?.hasChildren}
      <button
        type="button"
        class="tree-chevron-button"
        on:click|stopPropagation={() => data && onToggleExpand?.(data.fullPath)}
        aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
      >
        {#if isExpanded}
          <ChevronDown size={14} />
        {:else}
          <ChevronRight size={14} />
        {/if}
      </button>
    {/if}
  </span>
  <div class="tree-icon">
    <WorkspaceTreeViewIcon size={14} toggleState={isExpanded} treeNode={data} />
  </div>
  <span class="tree-name" title={data?.fullPath ?? ''}>
    {data?.name ?? ''}
  </span>
</div>

<style>
  .tree-cell {
    align-items: center;
    display: flex;
    gap: 1px;
    height: 100%;
  }

  .tree-chevron {
    align-items: center;
    display: flex;
    flex-shrink: 0;
    height: 14px;
    justify-content: center;
    width: 14px;
  }

  .tree-chevron-button {
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    height: 14px;
    justify-content: center;
    padding: 0;
    width: 14px;
  }

  .tree-icon {
    align-items: center;
    display: flex;
    height: 14px;
    margin-right: 3px;
    width: 14px;
  }

  .tree-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
