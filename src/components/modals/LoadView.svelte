<svelte:options accessors={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import type { View } from '../../types';
  import {
    reqDeleteView,
    reqGetView,
    reqGetViews,
  } from '../../utilities/requests';
  import { tooltip } from '../../utilities/tooltip';

  const dispatch = createEventDispatcher();

  export let currentView: View;
  export let modal: Modal | null = null;

  let views: View[] = [];

  async function onDeleteView(view: View) {
    const { message, nextView, success } = await reqDeleteView(view.id);

    if (success) {
      views = views.filter(v => v.id !== view.id);
      if (currentView.id === view.id) {
        // If we deleted the view we are viewing, switch to the next view.
        dispatch('setView', { view: nextView });
      }
    } else {
      console.log(message);
    }
  }

  async function onLoadView(viewId: number) {
    const query = new URLSearchParams(`?viewId=${viewId}`);
    const view = await reqGetView(fetch, query);

    if (view) {
      dispatch('setView', { view });
      modal.hide();
    } else {
      console.log(`No view found for ID: ${viewId}`);
    }
  }

  async function onShow(event: CustomEvent<boolean>) {
    const { detail: shown } = event;
    if (shown) {
      const newViews = await reqGetViews();
      views = newViews;
    }
  }
</script>

<Modal bind:this={modal} height={400} width={600} on:show={onShow}>
  <div class="header">
    <div class="title">Load View</div>
    <button class="st-button icon fs-6" on:click|stopPropagation={modal.hide}>
      <i class="bi bi-x" />
    </button>
  </div>

  {#if views.length}
    <div class="content">
      <table class="st-table">
        <thead>
          <tr>
            <th>Actions</th>
            <th>ID</th>
            <th>Name</th>
            <th>Owner</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {#each views as view}
            <tr>
              <td class="actions">
                <button
                  class="st-button icon"
                  on:click={() => onLoadView(view.id)}
                  use:tooltip={{
                    content: 'Load View',
                    placement: 'bottom',
                  }}
                >
                  <i class="bi bi-box-arrow-in-up-right" />
                </button>
                {#if view.meta.owner !== 'system'}
                  <button
                    class="st-button icon"
                    on:click={() => onDeleteView(view)}
                    use:tooltip={{
                      content: 'Delete View',
                      placement: 'bottom',
                    }}
                  >
                    <i class="bi bi-trash" />
                  </button>
                {/if}
              </td>
              <td>{view.id}</td>
              <td>{view.name}</td>
              <td>{view.meta.owner}</td>
              <td>{view.meta.timeUpdated}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="content flex-center">No Views Found</div>
  {/if}
</Modal>
