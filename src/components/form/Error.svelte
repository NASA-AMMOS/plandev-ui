<svelte:options immutable={true} />

<script lang="ts">
  import { tooltip } from '../../utilities/tooltip';

  export let error: string | null = null;
  export let invalid: boolean = false;
</script>

{#if invalid}
  <div
    class="form-error"
    use:tooltip={{
      content: error,
      maxWidth: 'none',
      placement: 'bottom',
      theme: 'error',
    }}
  >
    <span>{error}</span>
  </div>
{/if}

<style>
  .form-error {
    cursor: default;
    display: table;
    table-layout: fixed;
    width: 100%;
  }

  .form-error > span {
    color: var(--st-red);
    display: table-cell;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
