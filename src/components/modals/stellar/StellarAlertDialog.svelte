<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { ModalSize } from '../../../types/stellar-modal';
  import StellarDialog from './StellarDialog.svelte';

  export let open: boolean = true;
  export let closeOnEscape: boolean = true;
  export let closeOnOutsideClick: boolean = true;
  export let size: ModalSize = 'lg';
  export let title: string;
  export let message: string = '';
  export let actionCanBeUndone: boolean = true;
  export let cancelText: string = 'Cancel';
  export let confirmText: string = 'Confirm';
  export let confirmButtonVariant: 'default' | 'destructive' = 'destructive';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: void;
  }>();

  function handleCancel() {
    open = false;
  }

  function handleConfirm() {
    open = false;
    dispatch('confirm');
  }
</script>

<StellarDialog bind:open {closeOnEscape} {closeOnOutsideClick} {size} {title} showCloseButton={false} on:close>
  <div class="text-sm text-muted-foreground">
    {#if message}
      <p>{message}</p>
    {/if}
    <slot />
    {#if !actionCanBeUndone}
      <p class="mt-2 italic">This action cannot be undone.</p>
    {/if}
  </div>
  <svelte:fragment slot="footer">
    <div class="flex flex-col-reverse gap-2 sm:flex-row-reverse sm:justify-end">
      <Button size="lg" variant={confirmButtonVariant} on:click={handleConfirm}>
        {confirmText}
      </Button>
      <Button size="lg" variant="outline" on:click={handleCancel}>
        {cancelText}
      </Button>
    </div>
  </svelte:fragment>
</StellarDialog>
