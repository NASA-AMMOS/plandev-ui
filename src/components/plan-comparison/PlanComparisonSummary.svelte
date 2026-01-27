<svelte:options immutable={true} />

<script lang="ts">
  import type { ComparisonSource, PlanComparisonSummary as Summary } from '../../types/plan-comparison';

  export let leftSource: ComparisonSource | null;
  export let rightSource: ComparisonSource | null;
  export let summary: Summary | null;
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col items-center gap-2">
    <div class="flex flex-col items-center gap-1">
      <span class="text-xs font-medium uppercase text-muted-foreground">Left</span>
      <span class="break-words text-center text-sm font-medium">
        {#if leftSource}
          {leftSource.name}
          <span class="text-xs text-muted-foreground">({leftSource.type})</span>
        {:else}
          Not selected
        {/if}
      </span>
    </div>
    <div class="text-sm text-muted-foreground">vs</div>
    <div class="flex flex-col items-center gap-1">
      <span class="text-xs font-medium uppercase text-muted-foreground">Right</span>
      <span class="break-words text-center text-sm font-medium">
        {#if rightSource}
          {rightSource.name}
          <span class="text-xs text-muted-foreground">({rightSource.type})</span>
        {:else}
          Not selected
        {/if}
      </span>
    </div>
  </div>

  {#if summary}
    <div class="flex flex-col gap-1 rounded border border-border p-3">
      <div class="flex items-center justify-between">
        <span class="text-[13px] text-muted-foreground">Total Activities</span>
        <span class="font-mono text-[13px] font-medium">{summary.total}</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-[13px] text-muted-foreground">Added</span>
        <span class="font-mono text-[13px] font-medium text-green-600">+{summary.added}</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-[13px] text-muted-foreground">Deleted</span>
        <span class="font-mono text-[13px] font-medium text-red-600">-{summary.deleted}</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-[13px] text-muted-foreground">Modified</span>
        <span class="font-mono text-[13px] font-medium text-orange-600">~{summary.modified}</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-[13px] text-muted-foreground">Unchanged</span>
        <span class="font-mono text-[13px] font-medium">{summary.matched.unchanged}</span>
      </div>

      {#if summary.matched.ambiguous > 0}
        <div class="flex items-center justify-between">
          <span class="text-[13px] text-muted-foreground">Possibly Related</span>
          <span class="font-mono text-[13px] font-medium text-yellow-600">{summary.matched.ambiguous}</span>
        </div>
      {/if}
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase text-muted-foreground">Match Types</span>
      <div class="flex flex-wrap gap-2">
        {#if summary.matched.exact > 0}
          <span class="rounded bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600"
            >Exact: {summary.matched.exact}</span
          >
        {/if}
        {#if summary.matched.moved > 0}
          <span class="rounded bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-600"
            >Moved: {summary.matched.moved}</span
          >
        {/if}
        {#if summary.matched.fuzzy > 0}
          <span class="rounded bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-600"
            >Fuzzy: {summary.matched.fuzzy}</span
          >
        {/if}
      </div>
    </div>
  {:else}
    <div class="p-4 text-center text-muted-foreground">
      <span class="text-xs font-medium uppercase">No comparison data</span>
    </div>
  {/if}
</div>
