<svelte:options immutable={true} />

<script lang="ts">
  import type { Placement } from 'tippy.js';
  import { tooltip } from '../../utilities/tooltip';

  type Tooltip = {
    content: string;
    placement: Placement;
  };

  export let rowData: TRowData;
  export let editTooltip: Tooltip = undefined;
  export let deleteTooltip: Tooltip = undefined;

  export let editCallback: (data: TRowData) => void = undefined;
  export let deleteCallback: (data: TRowData) => void = undefined;
</script>

{#if editCallback}
  <button
    class="st-button icon"
    on:click|stopPropagation={() => {
      editCallback(rowData);
    }}
    use:tooltip={editTooltip}
  >
    <i class="bi bi-pencil" />
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
    <i class="bi bi-trash" />
  </button>
{/if}
