<svelte:options immutable={true} />

<script lang="ts">
  import { DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { ChartType, Layer, Row, TimelineItemType } from '../types/timeline';

  export let rows: Row[] = [];
  export let chartType: ChartType = 'activity';
  export let layerItem: TimelineItemType | undefined = undefined;

  const dispatch = createEventDispatcher<{
    select: { item?: TimelineItemType; layer?: Layer; row?: Row };
    visibilityChange: boolean;
  }>();

  let isResourceChart: boolean = false;

  $: isResourceChart = chartType === 'x-range' || chartType === 'line';

  function onSelect(item: TimelineItemType | undefined, row?: Row, layer?: Layer | undefined) {
    dispatch('select', { item, layer, row });
  }

  function onOpenChange(open: boolean) {
    dispatch('visibilityChange', open);
  }
</script>

<DropdownMenu.Root {onOpenChange}>
  <DropdownMenu.Trigger asChild let:builder>
    <slot builders={[builder]} />
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    avoidCollisions
    class="w-56"
    aria-label={`layer-picker-${chartType}-${layerItem?.name}`}
    align="start"
  >
    <DropdownMenu.Label size="sm">Add Filter to Row</DropdownMenu.Label>
    {#if rows.length < 1}
      <div class="st-typography-label empty">No rows found</div>
    {/if}
    {#each rows as row}
      {#if isResourceChart}
        <DropdownMenu.Item size="sm" on:click={() => onSelect(layerItem, row)}>{row.name}</DropdownMenu.Item>
      {:else}
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger size="sm">{row.name}</DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            <!-- Limit selection to rows if resource chart  -->
            {#if isResourceChart}
              <DropdownMenu.Item size="sm" on:click={() => onSelect(layerItem, row)}>{row.name}</DropdownMenu.Item>
            {:else}
              {#each row.layers.filter(l => l.chartType === chartType) as layer}
                <DropdownMenu.Item size="sm" on:click={() => onSelect(layerItem, row, layer)}>
                  <div class="capitalize">
                    {layer.name || `${layer.chartType} Layer`}
                  </div>
                </DropdownMenu.Item>
              {/each}
              <DropdownMenu.Item size="sm" on:click={() => onSelect(layerItem, row)}>
                <div class="layer-picker-context-menu-blue">New Layer +</div>
              </DropdownMenu.Item>
            {/if}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
      {/if}
    {/each}
    <DropdownMenu.Item size="sm" on:click={() => onSelect(layerItem)}>
      <div class="layer-picker-context-menu-blue">New Row +</div>
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<style>
  .empty {
    padding: 8px 4px;
    user-select: none;
  }

  :global(.layer-picker-context-menu-blue) {
    color: var(--st-utility-blue);
  }
</style>
