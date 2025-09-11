<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DerivationGroup } from '../../types/external-source';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let width: number = 380;
  export let height: number = 200;
  export let derivationGroups: DerivationGroup[];

  let derivationGroupsAreAllEmpty: boolean;

  $: derivationGroupsAreAllEmpty = derivationGroups.reduce(
    (isEmptyAcc: boolean, currentDerivationGroup: DerivationGroup) => {
      return isEmptyAcc && currentDerivationGroup.sources.size === 0;
    },
    true,
  );

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
    {#if !derivationGroupsAreAllEmpty}
      Derivation Group Cannot Be Deleted
    {:else}
      Delete Derivation Group
    {/if}
  </ModalHeader>
  <div class="modal-body">
    <ModalContent>
      {#if !derivationGroupsAreAllEmpty}
        <span class="st-typography-body">
          These Derivation Groups still contain the following sources which must be deleted first:
          {#each derivationGroups as derivationGroup}
            {#each derivationGroup.sources as source}
              <ul class="modal-content-text">
                <li>
                  {source[0]}
                </li>
              </ul>
            {/each}
          {/each}
        </span>
      {:else}
        <span class="st-typography-body modal-content-text">
          Are you sure you want to delete the following Derivation Groups:
          <ul class="modal-content-text">
            {#each derivationGroups as derivationGroup}
              <li>
                {derivationGroup.name}
              </li>
            {/each}
          </ul>
          <br />
          <i>This action cannot be undone.</i>
        </span>
      {/if}
    </ModalContent>
  </div>
  <ModalFooter>
    {#if !derivationGroupsAreAllEmpty}
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
