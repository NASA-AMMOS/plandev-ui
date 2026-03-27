<svelte:options immutable={true} />

<script lang="ts">
  import { Checkbox, Label } from '@nasa-jpl/stellar-svelte';
  import type { WorkspaceFileMetadata } from '../../types/workspace-tree-view';
  import { getShortISOForDate } from '../../utilities/time';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';

  export let fileMetadata: WorkspaceFileMetadata | null = null;
  export let onReadOnlyChange: ((readOnly: boolean) => void) | null = null;
</script>

<div class="grid h-full grid-rows-[min-content_auto]">
  <Sidebar.Header className="p-0">
    <div class="flex h-[48px] items-center justify-between gap-0 border-b border-border bg-background p-[6px]">
      <SectionTitle>Metadata</SectionTitle>
    </div>
  </Sidebar.Header>
  <Sidebar.Content className="h-full">
    <Sidebar.Group className="h-full p-0">
      <Sidebar.GroupContent className="h-full">
        <Sidebar.Menu className="h-full text-xs">
          {#if fileMetadata}
            <div class="flex flex-col gap-3 p-3">
              {#if fileMetadata.createdBy}
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-muted-foreground">Created by</span>
                  <span>{fileMetadata.createdBy}</span>
                </div>
              {/if}
              {#if fileMetadata.createdAt}
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-muted-foreground">Created</span>
                  <span>{getShortISOForDate(new Date(fileMetadata.createdAt))}</span>
                </div>
              {/if}
              {#if fileMetadata.lastEditedBy}
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-muted-foreground">Last edited by</span>
                  <span>{fileMetadata.lastEditedBy}</span>
                </div>
              {/if}
              {#if fileMetadata.lastEditedAt}
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-muted-foreground">Last edited</span>
                  <span>{getShortISOForDate(new Date(fileMetadata.lastEditedAt))}</span>
                </div>
              {/if}
              {#if fileMetadata.version}
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-muted-foreground">Version</span>
                  <span>{fileMetadata.version}</span>
                </div>
              {/if}
              <div class="flex items-center gap-1.5 pt-1">
                <Checkbox
                  checked={fileMetadata.readOnly ?? false}
                  on:click={() => onReadOnlyChange?.(!(fileMetadata?.readOnly ?? false))}
                  size="sm"
                  id="metadata-read-only"
                />
                <Label size="sm" for="metadata-read-only">Read only</Label>
              </div>
            </div>
          {:else}
            <div class="p-3 text-muted-foreground">No metadata available for this file.</div>
          {/if}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</div>
