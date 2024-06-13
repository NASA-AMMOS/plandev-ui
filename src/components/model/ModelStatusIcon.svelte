<svelte:options immutable={true} />

<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import ProgressRadial from '../ui/ProgressRadial.svelte';

  export let showCompleteStatus: boolean = true;
  export let status: 'extracting' | 'complete' | 'error' | 'none' = 'none';

  $: showCompleteStatus;
</script>

<div class="model-status-icon-container">
  {#if status === 'extracting'}
    <div data-testid="extracting"><ProgressRadial useBackground={false} size={14} /></div>
  {:else if status === 'complete' && showCompleteStatus}
    <div class="check" data-testid="complete"><CheckIcon /></div>
  {:else if status === 'error'}
    <div data-testid="error"><WarningIcon class="red-icon" /></div>
  {/if}
</div>

<style>
  .model-status-icon-container > div {
    align-items: center;
    display: flex;
  }

  .model-status-icon-container .check {
    background-color: #0eaf0a;
    border-radius: 50%;
    color: var(--st-white);
    display: flex;
  }
</style>
