<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import { plans } from '../../stores/plans';
  import type { ExternalSourcePkey, ExternalSourceSlim } from '../../types/external-source';
  import Collapse from '../Collapse.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 300;
  export let linked: { pkey: ExternalSourcePkey; plan_ids: number[] }[] = [];
  export let width: number = 400;
  export let sources: ExternalSourceSlim[] = [];
  export let unassociatedSources: ExternalSourceSlim[] = [];

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: void;
    refresh: void;
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
    {#if linked.length > 0}
      External Source Cannot Be Deleted
    {:else}
      Delete External Source
    {/if}
  </ModalHeader>
  <ModalContent style="overflow: auto;">
    {#if linked.length > 0}
      <span class="modal-content">
        The following External Sources are part of Derivation Groups that are still associated with the following plans:

        {#each linked as link}
          <div style="padding-left:10px">
            <Collapse
              title={link.pkey.key}
              tooltipContent={'Associated External Source ' + link.pkey.key}
              defaultExpanded={false}
            >
              <p><i>Derivation Group:</i> {link.pkey.derivation_group_name}</p>
              <Collapse
                title="Plans"
                tooltipContent={link.pkey.key + ' is associated with these plans.'}
                defaultExpanded={false}
              >
                {#each link.plan_ids as plan_id}
                  <a href="{base}/plans/{plan_id}">
                    {($plans || []).find(plan => plan_id === plan.id)?.name}
                  </a>
                {/each}
              </Collapse>
            </Collapse>
          </div>
        {/each}

        {#if unassociatedSources.length > 0}
          However, the following unassociated sources can still be deleted should you choose to do so:
          {#each unassociatedSources as externalSource}
            <div style="padding-left:10px">
              <b>{externalSource.key}</b>
            </div>
          {/each}
        {/if}
      </span>
    {:else}
      <span class="modal-content">
        Are you sure you want to delete the following?
        <ul>
          {#each sources as externalSource}
            <li>{externalSource.key}</li>
          {/each}
        </ul>
        <i>This action cannot be undone.</i>
      </span>
    {/if}
  </ModalContent>
  <ModalFooter>
    {#if linked.length > 0}
      <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
      {#if unassociatedSources.length > 0}
        <button class="st-button" on:click={() => dispatch('confirm')}> Delete Unassociated Sources </button>
      {/if}
    {:else}
      <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
      <button class="st-button" on:click={() => dispatch('confirm')}> Delete </button>
    {/if}
  </ModalFooter>
</Modal>

<style>
  .modal-content {
    display: block;
    overflow: auto;
    text-overflow: ellipsis;
  }
</style>
