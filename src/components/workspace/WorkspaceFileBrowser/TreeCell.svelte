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

<div class="flex h-full items-center gap-px" style:padding-left="{(data?.depth ?? 0) * INDENT_SIZE_PX}px">
  <span class="flex size-3.5 shrink-0 items-center justify-center">
    {#if data?.hasChildren}
      <button
        type="button"
        class="flex size-3.5 cursor-pointer items-center justify-center border-none bg-transparent p-0"
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
  <div class="mr-[3px] flex size-3.5 items-center">
    <WorkspaceTreeViewIcon size={14} toggleState={isExpanded} treeNode={data} />
  </div>
  <span class="truncate" title={data?.fullPath ?? ''}>
    {data?.name ?? ''}
  </span>
</div>
