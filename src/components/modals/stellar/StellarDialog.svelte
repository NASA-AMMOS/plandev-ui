<svelte:options immutable={true} />

<script lang="ts">
  import { Dialog } from '@nasa-jpl/stellar-svelte';
  import { cn, flyAndScale } from '@nasa-jpl/stellar-svelte/utils';
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import X from 'lucide-svelte/icons/x';
  import { createEventDispatcher } from 'svelte';
  import type { ModalSize } from '../../../types/stellar-modal';

  export let className: string = '';
  export let open: boolean = true;
  export let closeOnEscape: boolean = true;
  export let closeOnOutsideClick: boolean = true;
  export let showCloseButton: boolean = false;
  export let size: ModalSize = 'lg';
  export let title: string;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      dispatch('close');
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange} {closeOnEscape} {closeOnOutsideClick} portal={null}>
  <Dialog.Overlay class="bg-black/50" />
  <DialogPrimitive.Content
    transition={flyAndScale}
    transitionConfig={{ duration: 200 }}
    class={cn(
      'fixed left-[50%] top-[50%] z-50 flex w-full translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-lg border bg-background p-6 shadow-popover',
      {
        'max-w-4xl': size === 'full',
        'max-w-lg': size === 'lg',
        'max-w-md': size === 'md',
        'max-w-sm': size === 'sm',
        'max-w-xl': size === 'xl',
        'min-w-[300px] max-w-fit': size === 'auto',
      },
      className,
    )}
  >
    <Dialog.Header class="flex flex-row items-center justify-between pb-2">
      <Dialog.Title>{title}</Dialog.Title>
      {#if showCloseButton}
        <button
          type="button"
          class="!m-0 flex h-6 w-6 items-center justify-center rounded-sm text-gray-800 ring-offset-background transition-opacity hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          on:click={() => (open = false)}
        >
          <X class="h-5 w-5" />
          <span class="sr-only">Close</span>
        </button>
      {/if}
    </Dialog.Header>
    <slot />
    <Dialog.Footer>
      <slot name="footer" />
    </Dialog.Footer>
  </DialogPrimitive.Content>
</Dialog.Root>
