<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import Tab from '../ui/Tabs/Tab.svelte';
  import TabPanel from '../ui/Tabs/TabPanel.svelte';
  import Tabs from '../ui/Tabs/Tabs.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 270;
  export let plan: Plan;
  export let width: number = 400;
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Branches</ModalHeader>
  <ModalContent>
    <div class="plan-branches-container">
      <Tabs>
        <svelte:fragment slot="tab-list">
          <Tab disabled>Active</Tab>
          <Tab disabled>Merged</Tab>
          <Tab disabled>Rejected</Tab>
          <Tab>All</Tab>
        </svelte:fragment>
        <TabPanel disabled />
        <TabPanel disabled />
        <TabPanel disabled />
        <TabPanel>
          <div class="plan-branched-plans">
            {#each plan.child_plans as childPlan}
              <div class="branched-plan"><a href={`${base}/plans/${childPlan.id}`}>{childPlan.name}</a></div>
            {/each}
          </div>
        </TabPanel>
      </Tabs>
    </div>
  </ModalContent>
</Modal>

<style>
  .plan-branches-container {
    --tab-list-background-color: var(--st-white);
    --tab-list-gap: 0 8px;
    --tab-background-color: var(--st-white);
    --tab-text-color: var(--st-gray-50);
    --tab-hover-background-color: none;
    --tab-selected-background-color: var(--st-white);
    --tab-selected-text-color: var(--st-black);
    --tab-padding: 2px 0;
    --tab-height: auto;
  }

  .plan-branched-plans {
    padding: 8px;
  }

  .branched-plan {
    margin-bottom: 2rem;
  }

  .branched-plan a {
    color: var(--st-black);
    font-weight: var(--st-typography-medium-font-weight);
    text-decoration: none;
  }
</style>
