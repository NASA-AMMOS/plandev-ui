<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DerivationGroup } from '../../types/external-source';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 200;
  export let derivationGroup: DerivationGroup;
  export let width: number = 380;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: void;
  }>();

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      dispatch('confirm');
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>
    {#if derivationGroup.sources.size > 0}
      Derivation Group Cannot Be Deleted
    {:else}
      Delete Derivation Group
    {/if}
  </ModalHeader>
  <div class="modal-body">
    <ModalContent>
      {#if derivationGroup.sources.size > 0}
        <span class="st-typography-body">
          This Derivation Group still contains the following sources which must be deleted first:
          {#each derivationGroup.sources as source}
            <ul class="modal-content-text">
              <li>
                {source[0]}
              </li>
            </ul>
          {/each}
        </span>
      {:else}
        <span class="st-typography-body modal-content-text">
          Are you sure you want to delete "{derivationGroup.name}"?
          <br />
          <i>This action cannot be undone.</i>
        </span>
      {/if}
    </ModalContent>
  </div>
  <ModalFooter>
    {#if derivationGroup.sources.size > 0}
      <button class="st-button" on:click={() => dispatch('close')}> Close </button>
    {:else}
      <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
      <button class="st-button" on:click={() => dispatch('confirm')}> Delete </button>
    {/if}
  </ModalFooter>
</Modal>

<style>
  .modal-body {
    height: 100%;
    overflow: auto;
  }

  .modal-content-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .modal-content-text > li {
    font-style: italic;
  }
</style>
