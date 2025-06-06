<svelte:options immutable={true} />

<script lang="ts">
  import { File, FileJson2 } from 'lucide-svelte';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';

  export let treeNode: WorkspaceTreeNode;
  export let size: number = 16;
</script>

{#if treeNode.type === WorkspaceContentType.Sequence}
  <FileJson2 {size} />
{:else if treeNode.type === WorkspaceContentType.Json}
  <FileJson2 {size} />
{:else}
  <File {size} />
{/if}
