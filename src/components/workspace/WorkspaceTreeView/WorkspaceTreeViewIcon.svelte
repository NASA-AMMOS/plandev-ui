<svelte:options immutable={true} />

<script lang="ts">
  import { File, FileJson2, Folder, FolderOpen } from 'lucide-svelte';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';

  export let treeNode: WorkspaceTreeNode | null | undefined;
  export let size: number = 16;
  export let toggleState: boolean | undefined = undefined;
</script>

{#if treeNode}
  {#if treeNode.type === WorkspaceContentType.Directory || treeNode.type === WorkspaceContentType.Workspace}
    {#if toggleState}
      <FolderOpen size={16} />
    {:else}
      <Folder size={16} />
    {/if}
  {:else if treeNode.type === WorkspaceContentType.Sequence}
    <FileJson2 {size} />
  {:else if treeNode.type === WorkspaceContentType.Json}
    <FileJson2 {size} />
  {:else}
    <File {size} />
  {/if}
{:else}
  <File {size} />
{/if}
