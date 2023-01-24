<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { classNames } from '../../utilities/generic';

  export let label: string = '';
  export let removable: boolean = true;

  const dispatch = createEventDispatcher();

  $: rootClasses = classNames('st-chip st-typography-body', {
    'chip-removable': removable,
    'chip-with-label': !!label,
  });
</script>

<button class={rootClasses} on:click|preventDefault={() => dispatch('click')}>
  <div class="chip-label">{label}</div>
  {#if removable}
    <div class="chip-remove-button">
      <CloseIcon />
    </div>
  {/if}
</button>

<style>
  .st-chip {
    align-items: center;
    background-color: var(--st-gray-10);
    border: none;
    border-radius: 4px;
    color: var(--st-gray-90);
    cursor: pointer;
    display: inline-grid;
    grid-template-columns: min-content;
    height: 24px;
    line-height: 24px;
    overflow: hidden;
    padding: 8px;
    position: relative;
    text-align: left;
    white-space: nowrap;
    width: min-content;
  }

  .st-chip:hover {
    background-color: var(--st-gray-20);
  }

  .st-chip:hover .chip-label {
    width: calc(100% - 20px);
  }

  .st-chip:hover .chip-remove-button {
    display: flex;
  }

  .chip-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chip-remove-button {
    align-items: center;
    background-color: var(--st-gray-30);
    color: var(--st-gray-100);
    display: none;
    height: 24px;
    justify-content: center;
    position: absolute;
    right: 0;
    top: 0;
    width: 24px;
  }
</style>
