<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import Table from '../ui/Table.svelte';
  import Panel from '../ui/Panel.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import type Modal from '../modals/Modal.svelte';
  import { view } from '../../stores/views';
  import { setQueryParam } from '../../utilities/generic';
  import req from '../../utilities/requests';
  import { tooltip } from '../../utilities/tooltip';

  export let gridId: number;

  let confirmDeleteViewModal: Modal;
  let views: View[] = [];

  onMount(async () => {
    views = await req.getViews();
  });

  async function onDeleteView(event: CustomEvent<{ viewId: number }>) {
    const { detail } = event;
    const { viewId } = detail;
    const { message, nextView, success } = await req.deleteView(viewId);

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

  async function onLoadView(viewId: number) {
    const query = new URLSearchParams(`?viewId=${viewId}`);
    const newView = await req.getView(query);

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
    <GridMenu {gridId} title="Views" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if views.length}
      <Table
        let:currentRow
        columnDefs={[
          { field: 'id', name: 'ID', sortable: true },
          { field: 'name', name: 'Name', sortable: true },
          { field: 'meta.owner', name: 'Owner', sortable: true },
          { field: 'meta.timeUpdated', name: 'Last Updated', sortable: true },
        ]}
        rowActions
        rowData={views}
        on:rowClick={({ detail }) => onLoadView(detail.id)}
      >
        <span slot="actions-cell">
          {#if currentRow?.meta?.owner !== 'system'}
            <button
              class="st-button icon"
              on:click|stopPropagation={() => confirmDeleteViewModal.show({ viewId: currentRow.id })}
              use:tooltip={{ content: 'Delete View', placement: 'bottom' }}
            >
              <i class="bi bi-trash" />
            </button>
          {/if}
        </span>
      </Table>
    {:else}
      No Views Found
    {/if}
  </svelte:fragment>
</Panel>

<ConfirmModal
  bind:modal={confirmDeleteViewModal}
  confirmText="Delete"
  message="Are you sure you want to delete this view?"
  title="Delete View"
  on:confirm={onDeleteView}
/>
