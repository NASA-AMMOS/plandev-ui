<svelte:options immutable={true} />

<script lang="ts">
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { createEventDispatcher } from 'svelte';

  export let modelName: string = '';
  export let hasErrors: boolean = false;

  let isVisible: boolean = hasErrors;

  $: isVisible = hasErrors;

  const dispatch = createEventDispatcher<{
    viewModelErrors: void;
  }>();

  function onClickViewConsole() {
    dispatch('viewModelErrors');
  }

  function onDismiss() {
    isVisible = false;
  }
</script>

{#if isVisible}
  <div class="model-error-bar">
    <div class="info">
      Mission model <span class="model-name"><WarningIcon class="red-icon" />{modelName}</span> has extraction errors and
      this plan may not work correctly
    </div>

    <div class="buttons">
      <button on:click={onClickViewConsole} class="st-button view-button">View errors in console</button>
      <button class="st-button secondary" on:click={onDismiss}>Dismiss</button>
    </div>
  </div>
{/if}

<style>
  .model-error-bar {
    align-items: center;
    background-color: #fcf3ea;
    border-bottom: 1px solid #f2994a;
    display: flex;
    justify-content: space-between;
    padding: 10px 16px;
  }

  .model-error-bar .info {
    align-items: center;
    color: var(--st-gray-100, #1b1d1e);
    column-gap: 10px;
    display: flex;
    font-weight: 500;
  }

  .model-error-bar .model-name {
    align-items: center;
    background-color: var(--st-white, #fff);
    border: 1px solid var(--st-gray-100, #1b1d1e);
    border-radius: 16px;
    column-gap: 8px;
    display: inline-flex;
    padding: 4px 12px;
  }
</style>
