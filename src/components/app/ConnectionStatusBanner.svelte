<svelte:options immutable={true} />

<script lang="ts">
  import { connectionState } from '../../stores/gqlClient';

  // Delay showing banner to avoid flash on quick reconnects (e.g., role switch)
  let showBanner = false;
  let bannerTimeout: ReturnType<typeof setTimeout> | null = null;

  $: {
    if ($connectionState === 'reconnecting') {
      // Only show banner after 1s of being in reconnecting state
      bannerTimeout = setTimeout(() => {
        showBanner = true;
      }, 1000);
    } else {
      // Clear timeout and hide banner immediately when connected
      if (bannerTimeout) {
        clearTimeout(bannerTimeout);
        bannerTimeout = null;
      }
      showBanner = false;
    }
  }
</script>

{#if showBanner}
  <div
    class="fixed left-1/2 top-0 z-50 -translate-x-1/2 rounded-b-md bg-orange-400 px-4 py-1.5 text-sm font-medium text-black shadow-md dark:bg-orange-700 dark:text-white"
    role="status"
    aria-live="polite"
  >
    <span>Reconnecting to server...</span>
  </div>
{/if}
