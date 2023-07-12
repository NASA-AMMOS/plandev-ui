<script lang="ts">
  import PlayIcon from '@nasa-jpl/stellar/icons/play.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { tooltip } from '../../utilities/tooltip';
  import { useActions, type ActionArray } from '../../utilities/useActions';

  export let disabled: boolean = false;
  export let showLabel: boolean = false;
  export let title: string = '';
  export let tooltipContent: string = '';
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher();
</script>

{#if showLabel}
  <span use:tooltip={{ content: tooltipContent, placement: 'top' }}>
    <button class="st-button icon has-label" {disabled} on:click={() => dispatch('click')} use:useActions={use}>
      <slot>
        <PlayIcon />
      </slot>
      {title}
    </button>
  </span>
{:else}
  <span use:tooltip={{ content: tooltipContent, placement: 'top' }}>
    <button
      class="st-button icon"
      {disabled}
      on:click={() => dispatch('click')}
      use:tooltip={{ content: title, placement: 'top' }}
      use:useActions={use}
    >
      <slot>
        <PlayIcon />
      </slot>
    </button></span
  >
{/if}

<style>
  .st-button {
    border: 1px solid var(--st-gray-30);
    margin-left: 8px;
    padding: 0 8px;
  }

  .has-label {
    gap: 4px;
  }
</style>
