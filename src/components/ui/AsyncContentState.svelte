<svelte:options immutable={true} />

<script lang="ts">
  import { Alert, Button } from '@nasa-jpl/stellar-svelte';
  import { Info, RefreshCw, TriangleAlert } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import Tooltip from './Tooltip.svelte';

  /**
   * A component for handling async content states (loading, error, empty, content).
   * Use this when an entire content area depends on an async operation completing.
   *
   * Unlike AlertError (which shows inline error banners alongside other content),
   * this component replaces the content area entirely based on the current state.
   */

  const dispatch = createEventDispatcher<{ retry: void }>();

  // State props - evaluated in priority order: error > loading > empty > content
  export let loading: boolean = false;
  export let error: string | null = null;

  // Empty state
  export let empty: boolean = false;
  export let emptyMessage: string = 'No items found';

  // Error customization
  export let errorMessage: string = 'An error occurred';
  export let showRetry: boolean = false;

  // Styling
  let className: string = '';
  export { className as class };

  function handleRetry() {
    dispatch('retry');
  }
</script>

{#if error}
  <Alert.Root variant="destructive" class={className}>
    <TriangleAlert class="h-4 w-4" />
    <Alert.Title>{errorMessage}</Alert.Title>
    {#if error !== errorMessage}
      <Alert.Description class="mt-1  block leading-none ">
        <Tooltip
          content={error}
          class="block max-w-[500px] whitespace-normal [&>span]:whitespace-normal"
          wrapperClass="block"
        >
          <span class="line-clamp-2 cursor-help">{error}</span>
        </Tooltip>
      </Alert.Description>
    {/if}
    {#if showRetry}
      <Button
        variant="ghost"
        class="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        on:click={handleRetry}
      >
        <RefreshCw class="h-3 w-3" />
        Retry
      </Button>
    {/if}
    <slot name="error-action" />
  </Alert.Root>
{:else if loading}
  <div class="py-1 text-xs font-medium text-muted-foreground {className}">
    <slot name="loading">Loading...</slot>
  </div>
{:else if empty}
  <slot name="empty">
    <Alert.Root class={className}>
      <Info class="h-4 w-4 stroke-muted-foreground" />
      <Alert.Description class="!translate-y-0 items-center truncate text-muted-foreground">
        {emptyMessage}
      </Alert.Description>
    </Alert.Root>
  </slot>
{:else}
  <slot />
{/if}
