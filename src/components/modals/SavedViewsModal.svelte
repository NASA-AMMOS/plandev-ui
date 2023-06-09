<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { initializeView, view, views } from '../../stores/views';
  import type { User } from '../../types/app';
  import type { View } from '../../types/view';
  import effects from '../../utilities/effects';
  import { setQueryParam } from '../../utilities/generic';
  import Tab from '../ui/Tabs/Tab.svelte';
  import TabPanel from '../ui/Tabs/TabPanel.svelte';
  import Tabs from '../ui/Tabs/Tabs.svelte';
  import ViewsTable from '../view/ViewsTable.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number | string = 150;
  export let width: number | string = 380;
  export let user: User | null;

  const dispatch = createEventDispatcher();

  let userViews: View[] = [];

  $: userViews = $views.filter((view: View) => view.owner === user.id);

  async function deleteView({ detail: viewId }: CustomEvent<number>) {
    const success = await effects.deleteView(viewId, user);

    if (success) {
      if ($view.id === viewId) {
        goToNextView();
      }
    }
  }

  async function deleteViews({ detail: viewIds }: CustomEvent<number[]>) {
    const success = await effects.deleteViews(viewIds, user);

    if (success) {
      if (viewIds.includes($view.id)) {
        goToNextView();
      }
    }
  }

  async function goToNextView() {
    const nextView = await effects.getView(null, user);
    initializeView({ ...nextView });
    setQueryParam('viewId', `${nextView.id}`);
  }

  async function openView({ detail: viewId }: CustomEvent<number>) {
    const query = new URLSearchParams(`?viewId=${viewId}`);
    const newView = await effects.getView(query, user);

    if (view) {
      initializeView({ ...newView });
      setQueryParam('viewId', `${newView.id}`);
      dispatch('close');
    } else {
      console.log(`No view found for ID: ${viewId}`);
    }
  }
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Saved Views</ModalHeader>
  <ModalContent style="padding:0">
    <Tabs class="view-tabs" tabListClassName="view-tabs-list">
      <svelte:fragment slot="tab-list">
        <Tab class="view-tab">All Views</Tab>
        <Tab class="view-tab">My Views</Tab>
      </svelte:fragment>
      <TabPanel>
        <ViewsTable views={$views} on:deleteView={deleteView} on:deleteViews={deleteViews} on:openView={openView} />
      </TabPanel>
      <TabPanel>
        <ViewsTable views={userViews} on:deleteView={deleteView} on:deleteViews={deleteViews} on:openView={openView} />
      </TabPanel>
    </Tabs>
  </ModalContent>
</Modal>

<style>
  :global(.view-tabs) {
    padding: 0 1rem 1rem;
  }

  :global(.view-tab) {
    --tab-background-color: var(--st-white);
    --tab-hover-background-color: var(--st-white);
    --tab-hover-text-color: var(--st-gray-70);
    --tab-padding: 0px;
    --tab-selected-background-color: var(--st-white);
    --tab-text-color: var(--st-gray-50);
  }

  :global(.view-tabs-list) {
    --tab-list-background-color: var(--st-white);
    --tab-list-gap: 8px;
    border-bottom: 1px solid var(--st-gray-15);
    width: 100%;
  }
</style>
