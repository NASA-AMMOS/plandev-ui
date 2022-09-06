<script lang="ts">
  import PlayIcon from '@nasa-jpl/stellar/icons/play.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { tooltip } from '../../utilities/tooltip';

  export let disabled: boolean = false;
  export let showLabel: boolean = false;
  export let title: string = '';

  const dispatch = createEventDispatcher();
</script>

{#if showLabel}
  <button class="st-button icon has-label" {disabled} on:click={() => dispatch('click')}>
    <slot>
      <PlayIcon />
    </slot>
    {title}
  </button>
{:else}
  <button
    class="st-button icon"
    {disabled}
    on:click={() => dispatch('click')}
    use:tooltip={{ content: title, placement: 'bottom' }}
  >
    <slot>
      <PlayIcon />
    </slot>
  </button>
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
