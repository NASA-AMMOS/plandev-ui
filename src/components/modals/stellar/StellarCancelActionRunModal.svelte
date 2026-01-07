<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ModalSize } from '../../../types/stellar-modal';
  import StellarAlertDialog from './StellarAlertDialog.svelte';

  export let open: boolean = true;
  export let closeOnEscape: boolean = true;
  export let closeOnOutsideClick: boolean = true;
  export let size: ModalSize = 'sm';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: boolean;
  }>();

  function onConfirm() {
    dispatch('confirm', true);
  }
</script>

<StellarAlertDialog
  bind:open
  {closeOnEscape}
  {closeOnOutsideClick}
  {size}
  title="Cancel Action Run"
  message="Are you sure you want to cancel this Action run?"
  cancelText="Nevermind"
  confirmText="Cancel Action Run"
  on:close
  on:confirm={onConfirm}
/>
