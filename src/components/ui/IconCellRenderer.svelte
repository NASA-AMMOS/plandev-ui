<svelte:options immutable={true} />

<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';

  export let type: 'error' | 'checkmark' = 'checkmark';
</script>

<div class="icon-cell">
  {#if type === 'checkmark'}
    <div class="check"><CheckIcon /></div>
  {:else if type === 'error'}
    <div class="red-icon"><WarningIcon /> Invalid Date</div>
  {/if}
</div>

<style>
  .icon-cell > div {
    align-items: center;
    display: flex;
    gap: 4px;
  }

  .icon-cell :global(svg) {
    flex-shrink: 0;
  }

  .icon-cell .check {
    background-color: #0eaf0a;
    border-radius: 50%;
    color: var(--st-white);
    display: flex;
  }
</style>
