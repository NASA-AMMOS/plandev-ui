<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import { ListX } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { BaseError } from '../../../types/errors';
  import { tooltip } from '../../../utilities/tooltip';

  export let errors: BaseError[] = [];
  export let title: string;
  export let isClearable: boolean = true;
  export let value: string;

  const dispatch = createEventDispatcher<{ clearMessages: void }>();

  function onClear() {
    dispatch('clearMessages');
  }
</script>

<Tabs.Content {value} class="h-full w-full">
  <div class="grid h-full w-full grid-rows-[min-content_auto]">
    <div
      class="mx-4 my-2.5 flex items-center justify-between text-[11px] font-bold uppercase leading-4 text-[var(--st-gray-60)]"
    >
      <div>{title}</div>
      {#if isClearable}
        <div
          class="cursor-pointer select-none hover:text-[var(--st-black)]"
          role="none"
          on:click={onClear}
          use:tooltip={{ content: `Clear ${title}`, placement: 'left' }}
        >
          <ListX />
        </div>
      {/if}
    </div>
    <div class="auto w-full text-xs">
      {#each errors as error}
        <div class="mx-4">
          <div class="inline-block w-full p-2 font-normal">
            <div><span class="mr-4 font-['JetBrains_mono']">{error.timestamp}</span>{error.message}</div>
          </div>
          {#if error.data || error.trace}
            <div class="w-full bg-[var(--st-primary-background-color)] p-2">
              {#if error.data && JSON.stringify(error.data) !== '{}'}
                <pre class="m-0 whitespace-pre-wrap bg-background">{JSON.stringify(error.data, undefined, 2)}</pre>
              {/if}
              {#if error.trace}
                <pre class="m-0 whitespace-pre-wrap">{error.trace}</pre>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</Tabs.Content>
