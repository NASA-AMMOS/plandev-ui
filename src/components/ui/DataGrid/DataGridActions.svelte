<svelte:options immutable={true} />

<script lang="ts">
  import DownloadIcon from '@nasa-jpl/stellar/icons/download.svg?component';
  import ExpandIcon from '@nasa-jpl/stellar/icons/expand.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import type { Placement } from 'tippy.js';
  import type { TRowData } from '../../../types/data-grid';
  import { tooltip } from '../../../utilities/tooltip';

  type RowData = $$Generic<TRowData>;

  type Tooltip = {
    content: string;
    placement: Placement;
  };

  export let rowData: RowData | undefined;
  export let editTooltip: Tooltip | undefined = undefined;
  export let deleteTooltip: Tooltip | undefined = undefined;
  export let downloadTooltip: Tooltip | undefined = undefined;
  export let viewTooltip: Tooltip | undefined = undefined;

  export let editCallback: ((data: RowData) => void) | undefined = undefined;
  export let deleteCallback: ((data: RowData) => void) | undefined = undefined;
  export let downloadCallback: ((data: RowData) => void) | undefined = undefined;
  export let viewCallback: ((data: RowData) => void) | undefined = undefined;
</script>

{#if viewCallback}
  <button
    class="st-button icon"
    on:click|stopPropagation={() => {
      if (rowData) {
        viewCallback?.(rowData);
      }
    }}
    use:tooltip={viewTooltip}
  >
    <ExpandIcon />
  </button>
{/if}
{#if downloadCallback}
  <button
    class="st-button icon"
    on:click|stopPropagation={() => {
      if (rowData) {
        downloadCallback?.(rowData);
      }
    }}
    use:tooltip={downloadTooltip}
  >
    <DownloadIcon />
  </button>
{/if}
{#if editCallback}
  <button
    class="st-button icon"
    on:click|stopPropagation={() => {
      if (rowData) {
        editCallback?.(rowData);
      }
    }}
    use:tooltip={editTooltip}
  >
    <PenIcon />
  </button>
{/if}
{#if deleteCallback}
  <button
    class="st-button icon"
    on:click|stopPropagation={() => {
      if (rowData) {
        deleteCallback?.(rowData);
      }
    }}
    use:tooltip={deleteTooltip}
  >
    <TrashIcon />
  </button>
{/if}
