<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let sourcePlanName: string;
  export let targetPlanName: string;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean };
  }>();

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  }

  function handleCancel() {
    open = false;
  }

  function handleConfirm() {
    open = false;
    dispatch('resolve', { confirm: true });
  }
</script>

<svelte:window on:keydown={onKeydown} />

<StellarDialog bind:open size="sm" title="Derivation Group Behavior" on:close>
  <div class="py-2">
    <p>
      The derivation groups unique to <i>{sourcePlanName}</i> will now be associated with <i>{targetPlanName}</i>. This
      operation does not affect <i>{sourcePlanName}</i> itself.
    </p>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      cancelText="Cancel"
      confirmText="Confirm"
      on:cancel={handleCancel}
      on:confirm={handleConfirm}
    />
  </svelte:fragment>
</StellarDialog>
