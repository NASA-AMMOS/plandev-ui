<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ChartType, Layer, Row, TimelineItemType } from '../types/timeline';
  import ContextMenu from './context-menu/ContextMenu.svelte';
  import ContextMenuHeader from './context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from './context-menu/ContextMenuItem.svelte';
  import ContextSubMenuItem from './context-menu/ContextSubMenuItem.svelte';

  export let rows: Row[] = [];
  export let chartType: ChartType = 'activity';

  const dispatch = createEventDispatcher<{
    select: { item?: TimelineItemType; layer?: Layer; row?: Row };
  }>();

  let contextMenu: ContextMenu;
  let layerItem: TimelineItemType | undefined = undefined;

  export function toggle(e: MouseEvent, item?: TimelineItemType) {
    if (contextMenu.isShown()) {
      hide();
    } else {
      show(e);
      layerItem = item || undefined;
    }
  }

  export function hide() {
    contextMenu.hide();
    layerItem = undefined;
  }

  export function show(e: MouseEvent) {
    const bounds = (e.target as HTMLElement).getBoundingClientRect();
    contextMenu.showDirectly(bounds.x, bounds.y + bounds.height + 4, bounds.x);
  }

  export function onSelect(item: TimelineItemType | undefined, row?: Row, layer?: Layer | undefined) {
    dispatch('select', { item, layer, row });
    hide();
  }
</script>

<div aria-label={`layer-picker-${chartType}-${layerItem?.name}`}>
  <ContextMenu hideAfterClick={false} bind:this={contextMenu}>
    <ContextMenuHeader>Add Filter to Row</ContextMenuHeader>
    {#if rows.length < 1}
      <div class="st-typography-label empty">No rows found</div>
    {/if}
    {#each rows as row}
      <ContextSubMenuItem text={row.name} parentMenu={contextMenu} hideAfterClick={false}>
        {#each row.layers.filter(l => l.chartType === chartType) as layer}
          <ContextMenuItem on:click={() => onSelect(layerItem, row, layer)}>
            <div class="layer">
              {layer.name || `${layer.chartType} Layer`}
            </div>
          </ContextMenuItem>
        {/each}
        <ContextMenuItem on:click={() => onSelect(layerItem, row)}>
          <div class="layer-picker-context-menu-blue">New Layer +</div>
        </ContextMenuItem>
      </ContextSubMenuItem>
    {/each}
    <ContextMenuItem on:click={() => onSelect(layerItem)}>
      <div class="layer-picker-context-menu-blue">New Row +</div>
    </ContextMenuItem>
  </ContextMenu>
</div>

<style>
  .layer {
    text-transform: capitalize;
  }

  .empty {
    padding: 8px 4px;
    user-select: none;
  }

  :global(.layer-picker-context-menu-blue) {
    color: var(--st-utility-blue);
  }
</style>
