<svelte:options immutable={true} />

<script lang="ts">
  import RemoveAllIcon from '@nasa-jpl/stellar/icons/remove_all.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { BaseError } from '../../../types/errors';
  import { tooltip } from '../../../utilities/tooltip';
  import TabPanel from '../../ui/Tabs/TabPanel.svelte';
  import { ConsoleContextKey } from '../Console.svelte';

  export let errors: BaseError[] = [];
  export let title: string;
  export let isClearable: boolean = true;

  const dispatch = createEventDispatcher<{ clearMessages: void }>();

  function onClear() {
    dispatch('clearMessages');
  }
</script>

<TabPanel tabContextKey={ConsoleContextKey}>
  <div class="generic-errors-container">
    <div class="console-header">
      <div>{title}</div>
      {#if isClearable}
        <div
          class="clear-console"
          role="none"
          on:click={onClear}
          use:tooltip={{ content: `Clear ${title}`, placement: 'left' }}
        >
          <RemoveAllIcon />
        </div>
      {/if}
    </div>
    <div class="errors">
      {#each errors as error}
        <div class="error">
          <div class="reason">
            <div><span class="timestamp">{error.timestamp}</span>{error.message}</div>
          </div>
          {#if error.data || error.trace}
            <div class="trace">
              {#if error.data && JSON.stringify(error.data) !== '{}'}
                <pre>{JSON.stringify(error.data)}</pre>
              {/if}
              {#if error.trace}
                <pre>{error.trace}</pre>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</TabPanel>

<style>
  .generic-errors-container {
    display: grid;
    grid-template-rows: min-content auto;
    height: 100%;
  }

  .console-header {
    color: var(--st-gray-60);
    display: grid;
    font-size: 11px;
    font-weight: 700;
    grid-template-columns: auto min-content;
    justify-content: space-between;
    line-height: 1rem;
    margin: 0.65rem 1rem;
    text-transform: uppercase;
  }

  .clear-console {
    cursor: pointer;
    user-select: none;
  }

  .clear-console:hover {
    color: var(--st-black);
  }

  .errors {
    overflow-y: auto;
  }

  .error {
    margin: 0 1rem 12px;
  }

  .timestamp {
    font-family: 'JetBrains mono';
    margin-right: 1rem;
  }

  .reason {
    display: inline-block;
    font-size: 12px;
    font-weight: 400;
    margin-bottom: 8px;
  }

  .trace pre {
    margin: 0;
    white-space: pre-wrap;
  }

  .reason,
  .trace {
    background-color: var(--st-primary-background-color);
    padding: 0.5rem;
  }
</style>
