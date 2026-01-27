<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActivityComparisonResult } from '../../types/plan-comparison';
  import Collapse from '../Collapse.svelte';

  export let results: ActivityComparisonResult[];
  export let selectedActivityId: number | null;

  const dispatch = createEventDispatcher<{
    select: { activityId: number };
  }>();

  // Group results by change type
  $: added = results.filter(r => r.changeType === 'added');
  $: deleted = results.filter(r => r.changeType === 'deleted');
  $: modified = results.filter(r => r.changeType === 'matched' && r.changedFields.length > 0);
  $: unchanged = results.filter(r => r.changeType === 'matched' && r.changedFields.length === 0);

  // Build a set of selected activity IDs for reactive selection checks
  $: selectedIds = buildSelectedIds(results, selectedActivityId);

  function buildSelectedIds(allResults: ActivityComparisonResult[], selId: number | null): Set<number> {
    const ids = new Set<number>();
    if (selId === null) {
      return ids;
    }
    for (const result of allResults) {
      if (result.changeType === 'matched') {
        if (result.leftActivity.id === selId || result.rightActivity.id === selId) {
          ids.add(result.leftActivity.id);
          ids.add(result.rightActivity.id);
        }
      } else if (result.activity.id === selId) {
        ids.add(result.activity.id);
      }
    }
    return ids;
  }

  function getActivityId(result: ActivityComparisonResult): number {
    if (result.changeType === 'matched') {
      return result.leftActivity.id;
    }
    return result.activity.id;
  }

  function getActivityName(result: ActivityComparisonResult): string {
    if (result.changeType === 'matched') {
      return result.leftActivity.name;
    }
    return result.activity.name;
  }

  function getActivityType(result: ActivityComparisonResult): string {
    if (result.changeType === 'matched') {
      return result.leftActivity.type;
    }
    return result.activity.type;
  }

  function handleSelect(result: ActivityComparisonResult) {
    dispatch('select', { activityId: getActivityId(result) });
  }

  function isAmbiguous(result: ActivityComparisonResult): boolean {
    if (result.changeType !== 'matched') {
      return false;
    }
    return result.confidenceLevel === 'medium' || result.matchType === 'ambiguous';
  }
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
  {#if added.length > 0}
    <Collapse
      className="[&_.collapse-header]:ml-2"
      padContent={false}
      title="Added ({added.length})"
      defaultExpanded={true}
    >
      <div class="flex flex-col">
        {#each added as result (getActivityId(result))}
          <button
            class="flex w-full cursor-pointer items-center gap-2 border-0 border-b border-border bg-transparent px-4 py-2 text-left transition-colors duration-150
                   {selectedIds.has(getActivityId(result)) ? 'bg-primary/10' : 'hover:bg-muted/50'}"
            on:click={() => handleSelect(result)}
          >
            <span
              class="h-[18px] min-w-[18px] rounded-sm bg-green-500/20 text-center font-mono text-xs font-bold leading-[18px] text-green-600"
              >+</span
            >
            <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px]"
              >{getActivityName(result)}</span
            >
            <span class="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground"
              >{getActivityType(result)}</span
            >
          </button>
        {/each}
      </div>
    </Collapse>
  {/if}

  {#if deleted.length > 0}
    <Collapse
      className="[&_.collapse-header]:ml-2"
      padContent={false}
      title="Deleted ({deleted.length})"
      defaultExpanded={true}
    >
      <div class="flex flex-col">
        {#each deleted as result (getActivityId(result))}
          <button
            class="flex w-full cursor-pointer items-center gap-2 border-0 border-b border-border bg-transparent px-4 py-2 text-left transition-colors duration-150
                   {selectedIds.has(getActivityId(result)) ? 'bg-primary/10' : 'hover:bg-muted/50'}"
            on:click={() => handleSelect(result)}
          >
            <span
              class="h-[18px] min-w-[18px] rounded-sm bg-red-500/20 text-center font-mono text-xs font-bold leading-[18px] text-red-600"
              >-</span
            >
            <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px]"
              >{getActivityName(result)}</span
            >
            <span class="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground"
              >{getActivityType(result)}</span
            >
          </button>
        {/each}
      </div>
    </Collapse>
  {/if}

  {#if modified.length > 0}
    <Collapse
      className="[&_.collapse-header]:ml-2"
      padContent={false}
      title="Modified ({modified.length})"
      defaultExpanded={true}
    >
      <div class="flex flex-col">
        {#each modified as result (getActivityId(result))}
          <button
            class="flex w-full cursor-pointer items-center gap-2 border-0 border-b border-border bg-transparent px-4 py-2 text-left transition-colors duration-150
                   {selectedIds.has(getActivityId(result)) ? 'bg-yellow-500/30' : '!hover:bg-yellow-500'}
                   {isAmbiguous(result) ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : ''}"
            on:click={() => handleSelect(result)}
          >
            <span
              class="h-[18px] min-w-[18px] rounded-sm bg-orange-500/20 text-center font-mono text-xs font-bold leading-[18px] text-orange-600"
              >~</span
            >
            <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px]"
              >{getActivityName(result)}</span
            >
            <span class="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground"
              >{getActivityType(result)}</span
            >
            {#if result.changeType === 'matched'}
              <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {result.changedFields.length} change{result.changedFields.length !== 1 ? 's' : ''}
              </span>
              {#if result.confidenceLevel === 'medium' || result.matchType === 'ambiguous'}
                <span class="text-sm text-yellow-500" title="Possibly related - match confidence is medium">⚠</span>
              {/if}
            {/if}
          </button>
        {/each}
      </div>
    </Collapse>
  {/if}

  {#if unchanged.length > 0}
    <Collapse
      className="[&_.collapse-header]:ml-2"
      padContent={false}
      title="Unchanged ({unchanged.length})"
      defaultExpanded={false}
    >
      <div class="flex flex-col">
        {#each unchanged as result (getActivityId(result))}
          <button
            class="flex w-full cursor-pointer items-center gap-2 border-0 border-b border-border bg-transparent px-4 py-2 text-left transition-colors duration-150
                   {selectedIds.has(getActivityId(result)) ? 'bg-primary/10' : 'hover:bg-muted/50'}"
            on:click={() => handleSelect(result)}
          >
            <span
              class="h-[18px] min-w-[18px] rounded-sm bg-muted text-center font-mono text-xs font-bold leading-[18px] text-muted-foreground"
              >=</span
            >
            <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px]"
              >{getActivityName(result)}</span
            >
            <span class="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground"
              >{getActivityType(result)}</span
            >
          </button>
        {/each}
      </div>
    </Collapse>
  {/if}

  {#if results.length === 0}
    <div class="p-8 text-center text-muted-foreground">
      <span class="text-sm">No activities to compare</span>
    </div>
  {/if}
</div>
