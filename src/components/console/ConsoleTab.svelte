<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import { tooltip } from '../../utilities/tooltip';

  export let numberOfErrors: number = 0;
  export let title: string;
  export let value: string;
  export let collapsed: boolean = false;
</script>

<Tabs.Trigger
  {value}
  class={`tab-trigger ${
    collapsed
      ? 'data-[state=active]:bg-transparent data-[state=active]:text-gray-500'
      : 'data-[state=active]:bg-white data-[state=active]:text-neutral-800'
  }`}
>
  <div
    class="flex h-2 items-center gap-1 text-xs text-muted-foreground"
    class:text-neutral-800={numberOfErrors > 0}
    use:tooltip={{ content: title, placement: 'top' }}
  >
    <slot />{#if numberOfErrors > 0}<span
        class="flex min-w-5 items-center justify-center rounded-full bg-red-100 px-1 text-xs font-semibold text-red-800"
        >{numberOfErrors}</span
      >{/if}
  </div>
</Tabs.Trigger>
