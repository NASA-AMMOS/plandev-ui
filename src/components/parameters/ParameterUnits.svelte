<svelte:options immutable={true} />

<script lang="ts">
  import { tooltip } from '../../utilities/tooltip';

  export let unit: string | undefined = undefined;
</script>

{#if unit}
  <span class="parameter-units" use:tooltip={{ content: unit }}>{unit}</span>
{/if}

<style>
  .parameter-units {
    color: var(--st-gray-80, #293137);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.1px;
    line-height: 1rem;
    max-width: 3rem;
    opacity: 50%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
