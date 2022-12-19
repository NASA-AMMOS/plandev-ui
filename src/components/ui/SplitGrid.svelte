<svelte:options immutable={true} />

<script lang="ts">
  import Split, { type SplitInstance } from 'split-grid';
  import { createEventDispatcher, tick } from 'svelte';

  export let grid: Grid;
  export let gridComponentsByName: Record<string, any> = {};

  const dispatch = createEventDispatcher();

  let splitGridDiv: HTMLDivElement;
  let split: SplitInstance;

  $: if (splitGridDiv && grid) {
    setSplit();
  }

  function onDragEnd(): void {
    if (splitGridDiv) {
      if (grid.type === 'columns') {
        const newSizes: string = splitGridDiv.style['grid-template-columns'];
        dispatch('changeColumnSizes', { gridId: grid.id, newSizes });
      } else if (grid.type === 'rows') {
        const newSizes: string = splitGridDiv.style['grid-template-rows'];
        dispatch('changeRowSizes', { gridId: grid.id, newSizes });
      }
    }
  }

  async function setSplit() {
    await tick();

    if (split) {
      split.destroy();
    }
    split = Split({ onDragEnd });

    if (splitGridDiv) {
      const columnGutters = splitGridDiv.querySelectorAll<HTMLDivElement>(':scope > .split-grid-gutter.column');
      const rowGutters = splitGridDiv.querySelectorAll<HTMLDivElement>(':scope > .split-grid-gutter.row');

      for (const columnGutter of Array.from(columnGutters)) {
        const track = columnGutter.getAttribute('data-track');
        const trackAsNumber = parseFloat(track);
        split.addColumnGutter(columnGutter, trackAsNumber);
      }

      for (const rowGutter of Array.from(rowGutters)) {
        const track = rowGutter.getAttribute('data-track');
        const trackAsNumber = parseFloat(track);
        split.addRowGutter(rowGutter, trackAsNumber);
      }
    }
  }
</script>

{#if grid?.type === 'columns'}
  <div bind:this={splitGridDiv} class="split-grid" style="grid-template-columns: {grid.columnSizes};">
    {#each grid.columns as column}
      {#if column.type === 'gutter'}
        <div class="split-grid-gutter column" data-track={column.track} />
      {:else}
        <svelte:self grid={column} {gridComponentsByName} on:changeColumnSizes on:changeRowSizes />
      {/if}
    {/each}
  </div>
{:else if grid?.type === 'rows'}
  <div bind:this={splitGridDiv} class="split-grid" style="grid-template-rows: {grid.rowSizes};">
    {#each grid.rows as row}
      {#if row.type === 'gutter'}
        <div class="split-grid-gutter row" data-track={row.track} />
      {:else}
        <svelte:self grid={row} {gridComponentsByName} on:changeColumnSizes on:changeRowSizes />
      {/if}
    {/each}
  </div>
{:else if grid?.type === 'component'}
  <div class="split-grid-component" data-component-name={grid.componentName}>
    <svelte:component
      this={gridComponentsByName[grid.componentName]}
      {...grid?.props || {}}
      {...grid}
      gridId={grid.id}
      on:changeColumnSizes
      on:changeRowSizes
    />
  </div>
{/if}

<style>
  .split-grid {
    display: grid;
    overflow: auto;
  }

  .split-grid-component {
    display: grid;
    height: 100%;
    overflow-y: auto;
    width: 100%;
  }

  .split-grid-gutter {
    background-color: #eee;
    background-position: 50%;
    background-repeat: no-repeat;
  }

  .split-grid-gutter.column {
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
    cursor: col-resize;
  }

  .split-grid-gutter.row {
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');
    cursor: row-resize;
  }
</style>
