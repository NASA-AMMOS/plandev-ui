<script lang="ts">
  import { expired, refresh, refreshAt } from '$lib/stores/oidc';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  let ticking: ReturnType<typeof setInterval> | null = null;
  let countdown = writable<string>();

  onMount(() => {
    ticking = setInterval(() => {
      if ($refreshAt) {
        countdown.set((($refreshAt?.getTime() - new Date().getTime()) / 1000).toFixed(2));
      }
    }, 100);

    return () => {
      console.log('Dismounting refresh component');
      if (ticking) {
        console.log('Clearing ticking interval.');
        clearInterval(ticking);
      }
    };
  });
</script>

<div class="fixed bottom-4 right-4 h-32 w-64 items-center justify-center rounded bg-blue-500 p-4">
  <div class="text-lg font-bold text-white">Token Refresh</div>
  {#if $expired}
    <div class="text-red-500">Access token expired: {$expired}!</div>
  {:else}
    <div>Refreshing in {$countdown} seconds</div>
  {/if}
  <button
    on:click={refresh}
    class="mb-2 me-2 rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
  >
    Refresh Now
  </button>
</div>
