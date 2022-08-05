<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tooltip } from '../../utilities/tooltip';

  export let title: string = '';
  export let icon: string = 'bi bi-play-btn';
  export let showLabel: boolean = false;

  const dispatch = createEventDispatcher();
</script>

{#if showLabel}
  <button class="st-button icon has-label" on:click={() => dispatch('click')}>
    <i class={icon} />
    {title}
  </button>
{:else}
  <button
    class="st-button icon"
    on:click={() => dispatch('click')}
    use:tooltip={{ content: title, placement: 'bottom' }}
  >
    <i class={icon} />
  </button>
{/if}

<style>
  .st-button {
    border: 1px solid var(--st-gray-30);
    margin-left: 8px;
    padding: 0 8px;
  }

  .has-label i {
    margin-right: 4px;
  }
</style>
