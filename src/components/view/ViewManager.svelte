<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import type { View } from '../../types';
  import {
    reqDeleteView,
    reqGetView,
    reqGetViews,
  } from '../../utilities/requests';
  import { tooltip } from '../../utilities/tooltip';
  import Panel from '../ui/Panel.svelte';
  import Chip from '../ui/Chip.svelte';
  import ConfirmModal from '../../components/modals/Confirm.svelte';
  import { view } from '../../stores/views';
  import { setQueryParam } from '../../utilities/generic';

  let confirmDeleteView: ConfirmModal | null = null;
  let views: View[] = [];

  onMount(async () => {
    views = await reqGetViews();
  });

  async function onDeleteView(event: CustomEvent<{ viewId: number }>) {
    const { detail } = event;
    const { viewId } = detail;
    const { message, nextView, success } = await reqDeleteView(viewId);

    if (success) {
      views = views.filter(v => v.id !== viewId);
      if ($view.id === viewId) {
        // If we deleted the view we are viewing, switch to the next view.
        $view = nextView;
        setQueryParam('viewId', `${nextView.id}`);
      }
    } else {
      console.log(message);
    }
  }

  async function onLoadView(event: Event, viewId: number) {
    event.preventDefault();
    event.stopPropagation();

    const query = new URLSearchParams(`?viewId=${viewId}`);
    const newView = await reqGetView(fetch, query);

    if (view) {
      $view = newView;
      setQueryParam('viewId', `${newView.id}`);
    } else {
      console.log(`No view found for ID: ${viewId}`);
    }
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Manage Views</Chip>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if views.length}
      <table class="st-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Owner</th>
            <th>Last Updated</th>
            <th class="actions-header" />
          </tr>
        </thead>
        <tbody>
          {#each views as view}
            <tr on:click={e => onLoadView(e, view.id)}>
              <td>{view.id}</td>
              <td>{view.name}</td>
              <td>{view.meta.owner}</td>
              <td>{view.meta.timeUpdated}</td>
              <td class="actions-data">
                {#if view.meta.owner !== 'system'}
                  <button
                    class="st-button icon"
                    on:click|stopPropagation={() =>
                      confirmDeleteView.modal.show({ viewId: view.id })}
                    use:tooltip={{
                      content: 'Delete View',
                      placement: 'bottom',
                    }}
                  >
                    <i class="bi bi-trash" />
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      No Views Found
    {/if}
  </svelte:fragment>
</Panel>

<ConfirmModal
  bind:this={confirmDeleteView}
  confirmText="Delete"
  message="Are you sure you want to delete this view?"
  title="Delete View"
  on:confirm={onDeleteView}
/>
