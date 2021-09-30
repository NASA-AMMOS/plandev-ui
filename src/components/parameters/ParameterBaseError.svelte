<svelte:options immutable={true} />

<script lang="ts">
  import type { FormParameter } from '../../types';
  import { tooltip } from '../../utilities/tooltip';

  export let columns: string = '';
  export let formParameter: FormParameter;
</script>

{#if formParameter.error !== null}
  <div class="grid" style="grid-template-columns: {columns}">
    <div />
    <div
      class="parameter-base-error"
      use:tooltip={{
        content: formParameter.error,
        placement: 'left',
        theme: 'error',
      }}
    >
      <div>{formParameter.error}</div>
    </div>
  </div>
{/if}

<style>
  .grid {
    display: grid;
  }

  .parameter-base-error {
    display: table;
    table-layout: fixed;
    width: 100%;
  }

  .parameter-base-error > div {
    color: var(--red);
    display: table-cell;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
