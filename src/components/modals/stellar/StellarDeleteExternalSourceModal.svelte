<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import { plans } from '../../../stores/plans';
  import type { ExternalSourcePkey, ExternalSourceSlim } from '../../../types/external-source';
  import Collapse from '../../Collapse.svelte';
  import StellarDialog from './StellarDialog.svelte';

  export let open: boolean = true;
  export let linked: { pkey: ExternalSourcePkey; plan_ids: number[] }[] = [];
  export let sources: ExternalSourceSlim[] = [];
  export let unassociatedSources: ExternalSourceSlim[] = [];

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

<StellarDialog
  bind:open
  size="auto"
  className="w-[400px] h-[300px]"
  title={linked.length > 0 ? 'External Source Cannot Be Deleted' : 'Delete External Source'}
  closeOnEscape={false}
  closeOnOutsideClick={false}
  on:close
>
  <div class="modal-content overflow-auto py-2">
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
  </div>
  <svelte:fragment slot="footer">
    <div class="flex w-full justify-end gap-2">
      {#if linked.length > 0}
        <button class="st-button secondary" on:click={handleCancel}>Cancel</button>
        {#if unassociatedSources.length > 0}
          <button class="st-button" on:click={handleConfirm}>Delete Unassociated Sources</button>
        {/if}
      {:else}
        <button class="st-button secondary" on:click={handleCancel}>Cancel</button>
        <button class="st-button" on:click={handleConfirm}>Delete</button>
      {/if}
    </div>
  </svelte:fragment>
</StellarDialog>

<style>
  .modal-content {
    display: block;
    overflow: auto;
    text-overflow: ellipsis;
  }
</style>
