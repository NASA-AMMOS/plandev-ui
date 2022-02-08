<svelte:options immutable={true} />

<script lang="ts">
  import { tooltip } from '../../utilities/tooltip';

  export let formParameter: FormParameter;
</script>

{#if formParameter.error !== null}
  <div
    class="parameter-rec-error"
    use:tooltip={{
      content: formParameter.error,
      placement: 'left',
      theme: 'error',
    }}
  >
    <div>{formParameter.error}</div>
  </div>
{/if}

<style>
  .parameter-rec-error {
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    display: table;
    margin-bottom: 1rem;
    padding: 5px;
    table-layout: fixed;
    width: 100%;
  }

  .parameter-rec-error > div {
    color: var(--st-red);
    display: table-cell;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
