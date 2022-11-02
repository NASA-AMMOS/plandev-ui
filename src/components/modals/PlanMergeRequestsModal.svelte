<svelte:options immutable={true} />

<script lang="ts">
  import { planMergeRequestsIncoming, planMergeRequestsOutgoing } from '../../stores/plan';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalHeader from './ModalHeader.svelte';

  type RequestTypeFilter = 'all' | 'incoming' | 'outgoing';

  export let height: number = 400;
  export let width: number = 400;

  let filteredPlanMergeRequests: PlanMergeRequest[] = [];
  let selectedFilter: RequestTypeFilter = 'all';

  $: incomingMergeRequestCount = $planMergeRequestsIncoming.length;
  $: outgoingMergeRequestCount = $planMergeRequestsOutgoing.length;
  $: selectedFilterClass = (filter: RequestTypeFilter): string =>
    filter === selectedFilter ? 'st-typography-medium' : ' st-typography-label';
  $: filteredPlanMergeRequests =
    selectedFilter === 'incoming'
      ? $planMergeRequestsIncoming
      : selectedFilter === 'outgoing'
      ? $planMergeRequestsOutgoing
      : selectedFilter === 'all'
      ? [...$planMergeRequestsIncoming, ...$planMergeRequestsOutgoing]
      : [];
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Merge Requests</ModalHeader>
  <ModalContent style="padding: 0">
    <div class="plan-merge-requesets-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="plan-merge-requesets-row p-2">
        <div on:click={() => (selectedFilter = 'incoming')} class={selectedFilterClass('incoming')}>
          Incoming Requests ({incomingMergeRequestCount})
        </div>
        <div on:click={() => (selectedFilter = 'outgoing')} class={selectedFilterClass('outgoing')}>
          Outgoing Requests ({outgoingMergeRequestCount})
        </div>
        <div on:click={() => (selectedFilter = 'all')} class={selectedFilterClass('all')}>All</div>
      </div>

      {#if filteredPlanMergeRequests.length}
        {#each filteredPlanMergeRequests as filteredPlanMergeRequest}
          <div class="plan-merge-request p-2">
            <div class="plan-merge-request-row st-typography-medium">
              {#if filteredPlanMergeRequest.type === 'incoming'}
                {filteredPlanMergeRequest.plan_snapshot_supplying_changes.name} ({filteredPlanMergeRequest.status})
              {:else if filteredPlanMergeRequest.type === 'outgoing'}
                {filteredPlanMergeRequest.plan_receiving_changes.name} ({filteredPlanMergeRequest.status})
              {/if}
              <button class="st-button secondary">Review</button>
            </div>
            <div class="plan-merge-request-row">
              {filteredPlanMergeRequest.requester_username}
            </div>
          </div>
        {/each}
      {:else}
        <div class="p-2">No merge requests found</div>
      {/if}
    </div>
  </ModalContent>
</Modal>

<style>
  .plan-merge-requesets-container {
    height: 100%;
    width: 100%;
  }

  .plan-merge-requesets-row {
    border-bottom: 1px solid var(--st-gray-15);
    cursor: pointer;
    display: flex;
    gap: 10px;
  }

  .plan-merge-request {
    align-items: center;
    display: grid;
    grid-template-rows: auto auto;
  }

  .plan-merge-request-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }
</style>
