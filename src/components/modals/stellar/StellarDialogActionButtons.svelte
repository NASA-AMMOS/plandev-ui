<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';

  export let cancelText: string = 'Cancel';
  export let confirmText: string = 'Confirm';
  export let confirmDisabled: boolean = false;
  export let confirmVariant: 'default' | 'destructive' = 'default';

  const dispatch = createEventDispatcher<{
    cancel: void;
    confirm: void;
  }>();
</script>

<div class="flex justify-end gap-2">
  <Button size="lg" variant="outline" on:click={() => dispatch('cancel')}>{cancelText}</Button>
  <Button size="lg" variant={confirmVariant} disabled={confirmDisabled} on:click={() => dispatch('confirm')}>
    {confirmText}
  </Button>
</div>
