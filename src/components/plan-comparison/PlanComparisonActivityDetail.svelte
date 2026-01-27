<svelte:options immutable={true} />

<script lang="ts">
  import type { ComparisonActivity } from '../../types/plan-comparison';
  import Highlight from '../ui/Highlight.svelte';

  export let activity: ComparisonActivity | null;
  export let changedFields: string[];
  export let side: 'left' | 'right';

  function isFieldChanged(fieldName: string): boolean {
    // Check for exact match or prefix match (e.g., 'arguments' matches 'arguments.biteSize')
    return changedFields.some(f => f === fieldName || f.startsWith(`${fieldName}.`));
  }

  function formatArguments(args: Record<string, unknown>): string {
    return JSON.stringify(args, null, 2);
  }

  function formatMetadata(metadata: Record<string, unknown>): string {
    return JSON.stringify(metadata, null, 2);
  }

  function formatTags(tags: { color: string | null; id: number; name: string }[]): string {
    return tags.map(t => t.name).join(', ') || 'None';
  }
</script>

<div class="flex flex-col p-4 {!activity ? 'items-center flex-1 justify-center' : ''}">
  {#if activity}
    <div class="border-b border-border mb-3 pb-3">
      <Highlight highlight={isFieldChanged('name')}>
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs font-medium uppercase">Name</span>
          <span class="text-sm break-words">{activity.name}</span>
        </div>
      </Highlight>

      <Highlight highlight={isFieldChanged('type')}>
        <div class="flex flex-col gap-1 mt-3">
          <span class="text-muted-foreground text-xs font-medium uppercase">Type</span>
          <span class="text-sm break-words">{activity.type}</span>
        </div>
      </Highlight>

      <Highlight highlight={isFieldChanged('start_offset')}>
        <div class="flex flex-col gap-1 mt-3">
          <span class="text-muted-foreground text-xs font-medium uppercase">Start Offset</span>
          <span class="text-sm break-words">{activity.start_offset}</span>
        </div>
      </Highlight>

      <Highlight highlight={isFieldChanged('anchor_id')}>
        <div class="flex flex-col gap-1 mt-3">
          <span class="text-muted-foreground text-xs font-medium uppercase">Anchor ID</span>
          <span class="text-sm break-words">{activity.anchor_id ?? 'None (Plan Start)'}</span>
        </div>
      </Highlight>

      <Highlight highlight={isFieldChanged('anchored_to_start')}>
        <div class="flex flex-col gap-1 mt-3">
          <span class="text-muted-foreground text-xs font-medium uppercase">Anchored To Start</span>
          <span class="text-sm break-words">{activity.anchored_to_start ? 'Yes' : 'No'}</span>
        </div>
      </Highlight>
    </div>

    <div class="border-b border-border mb-3 pb-3">
      <Highlight highlight={isFieldChanged('arguments')}>
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs font-medium uppercase">Arguments</span>
          <pre class="text-xs bg-muted border border-border rounded p-2 max-h-[200px] overflow-auto whitespace-pre-wrap font-mono">{formatArguments(activity.arguments)}</pre>
        </div>
      </Highlight>
    </div>

    <div class="border-b border-border mb-3 pb-3">
      <Highlight highlight={isFieldChanged('metadata')}>
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs font-medium uppercase">Metadata</span>
          <pre class="text-xs bg-muted border border-border rounded p-2 max-h-[200px] overflow-auto whitespace-pre-wrap font-mono">{formatMetadata(activity.metadata)}</pre>
        </div>
      </Highlight>
    </div>

    <div class="border-b border-border mb-3 pb-3">
      <Highlight highlight={isFieldChanged('tags')}>
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs font-medium uppercase">Tags</span>
          <span class="text-sm break-words">{formatTags(activity.tags)}</span>
        </div>
      </Highlight>
    </div>

    <div>
      <div class="flex flex-col gap-1">
        <span class="text-muted-foreground text-xs font-medium uppercase">Activity ID</span>
        <span class="text-xs font-mono text-muted-foreground">{activity.id}</span>
      </div>
    </div>

  {:else}
    <div class="text-muted-foreground text-center">
      <span class="text-sm">
        {#if side === 'left'}
          Activity does not exist in left source
        {:else}
          Activity does not exist in right source
        {/if}
      </span>
    </div>
  {/if}
</div>
