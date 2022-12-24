<svelte:options immutable={true} />

<script lang="ts">
  import ExpandIcon from '@nasa-jpl/stellar/icons/expand.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import type { Placement } from 'tippy.js';
  import type { TRowData } from '../../../types/data-grid';
  import { tooltip } from '../../../utilities/tooltip';

  type Tooltip = {
    content: string;
    placement: Placement;
  };

  export let rowData: TRowData;
  export let editTooltip: Tooltip = undefined;
  export let deleteTooltip: Tooltip = undefined;
  export let viewTooltip: Tooltip = undefined;

  export let editCallback: (data: TRowData) => void = undefined;
  export let deleteCallback: (data: TRowData) => void = undefined;
  export let viewCallback: (data: TRowData) => void = undefined;
</script>

{#if viewCallback}
  <button
    class="st-button icon"
    on:click|stopPropagation={() => {
      viewCallback(rowData);
    }}
    use:tooltip={viewTooltip}
  >
    <ExpandIcon />
  </button>
{/if}
{#if editCallback}
  <button
    class="st-button icon"
    on:click|stopPropagation={() => {
      editCallback(rowData);
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
      deleteCallback(rowData);
    }}
    use:tooltip={deleteTooltip}
  >
    <TrashIcon />
  </button>
{/if}
