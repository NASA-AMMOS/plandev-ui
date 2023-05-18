<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import { planMergeRequestsIncoming, planMergeRequestsOutgoing } from '../../stores/plan';
  import type { PlanMergeRequest, PlanMergeRequestStatus, PlanMergeRequestTypeFilter } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { classNames } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  import PlanMergeRequestStatusBadge from '../plan/PlanMergeRequestStatusBadge.svelte';
  import UserBadge from '../ui/UserBadge.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 550;
  export let selectedFilter: PlanMergeRequestTypeFilter = 'all';
  export let width: number = 550;

  const dispatch = createEventDispatcher();

  let combinedPlanMergeRequests: PlanMergeRequest[] = [];
  let filteredPlanMergeRequests: PlanMergeRequest[] = [];
  let showPending = true;
  let showInProgress = true;
  let showAccepted = true;
  let showRejected = true;
  let showWithdrawn = false;

  $: incomingMergeRequestCount = getActiveRequestCount($planMergeRequestsIncoming);
  $: outgoingMergeRequestCount = getActiveRequestCount($planMergeRequestsOutgoing);

  $: selectedFilterClass = (filter: PlanMergeRequestTypeFilter) =>
    classNames('st-typography-medium', {
      'plan-merge-requests-tab-active': filter === selectedFilter,
    });

  $: combinedPlanMergeRequests =
    selectedFilter === 'incoming'
      ? $planMergeRequestsIncoming
      : selectedFilter === 'outgoing'
      ? $planMergeRequestsOutgoing
      : selectedFilter === 'all'
      ? [...$planMergeRequestsIncoming, ...$planMergeRequestsOutgoing]
      : [];

  $: if (
    showAccepted !== undefined &&
    showInProgress !== undefined &&
    showPending !== undefined &&
    showWithdrawn !== undefined &&
    showRejected !== undefined
  ) {
    filteredPlanMergeRequests = combinedPlanMergeRequests.filter(mergeRequest => {
      const status = mergeRequest.status;
      if (status === 'accepted') {
        return showAccepted;
      } else if (status === 'in-progress') {
        return showInProgress;
      } else if (status === 'pending') {
        return showPending;
      } else if (status === 'withdrawn') {
        return showWithdrawn;
      } else if (status === 'rejected') {
        return showRejected;
      }
    });
  }

  async function onReviewOrWithdraw(planMergeRequest: PlanMergeRequest) {
    if (planMergeRequest.type === 'incoming') {
      planMergeRequest.pending = true;
      filteredPlanMergeRequests = [...filteredPlanMergeRequests];
      const success = await effects.planMergeBegin(planMergeRequest.id);
      if (success) {
        dispatch('close');
        goto(`${base}/plans/${planMergeRequest.plan_receiving_changes.id}/merge`);
      }
    } else if (planMergeRequest.type === 'outgoing') {
      await effects.planMergeRequestWithdraw(planMergeRequest.id);
    }

    planMergeRequest.pending = false;
    filteredPlanMergeRequests = [...filteredPlanMergeRequests];
  }

  function getActiveRequestCount(requests: PlanMergeRequest[]): number {
    const activeRequestTypes: Record<PlanMergeRequestStatus, boolean> = {
      accepted: false,
      'in-progress': true,
      pending: true,
      rejected: false,
      withdrawn: false,
    };
    return requests.filter(request => {
      return activeRequestTypes[request.status];
    }).length;
  }
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Merge Requests</ModalHeader>
  <ModalContent style="overflow: auto;padding: 0">
    <div class="plan-merge-requests-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="plan-merge-requests-row">
        <div class="plan-merge-requests-tabs">
          <button on:click={() => (selectedFilter = 'incoming')} class={selectedFilterClass('incoming')}>
            <span>Incoming Requests</span>
            <span class="st-badge">{incomingMergeRequestCount}</span>
          </button>
          <button on:click={() => (selectedFilter = 'outgoing')} class={selectedFilterClass('outgoing')}>
            <span>Outgoing Requests</span>
            <span class="st-badge">{outgoingMergeRequestCount}</span>
          </button>
          <button on:click={() => (selectedFilter = 'all')} class={selectedFilterClass('all')}>
            <span>All</span>
          </button>
        </div>
      </div>

      <div class="plan-merge-requests-row">
        <div class="plan-merge-request-filters">
          <div class="plan-merge-request-filter">
            <input id="showPending" bind:checked={showPending} type="checkbox" />
            <label class="st-typography-label" for="showPending">Pending</label>
          </div>
          <div class="plan-merge-request-filter">
            <input id="showInProgress" bind:checked={showInProgress} type="checkbox" />
            <label class="st-typography-label" for="showInProgress">In Progress</label>
          </div>
          <div class="plan-merge-request-filter">
            <input id="showAccepted" bind:checked={showAccepted} type="checkbox" />
            <label class="st-typography-label" for="showAccepted">Accepted</label>
          </div>
          <div class="plan-merge-request-filter">
            <input id="showRejected" bind:checked={showRejected} type="checkbox" />
            <label class="st-typography-label" for="showRejected">Rejected</label>
          </div>
          <div class="plan-merge-request-filter">
            <input id="showWithdrawn" bind:checked={showWithdrawn} type="checkbox" />
            <label class="st-typography-label" for="showWithdrawn">Withdrawn</label>
          </div>
        </div>
      </div>

      {#if filteredPlanMergeRequests.length}
        <div class="plan-merge-requests">
          {#each filteredPlanMergeRequests as planMergeRequest}
            <div class="plan-merge-request">
              <div class="plan-merge-request-row st-typography-medium">
                <div class="plan-merge-request-row-metadata">
                  <div
                    class="plan-merge-request-row-branch-name"
                    use:tooltip={{
                      content:
                        planMergeRequest.type === 'incoming'
                          ? planMergeRequest.plan_snapshot_supplying_changes.name
                          : planMergeRequest.plan_receiving_changes.name,
                      placement: 'top',
                    }}
                  >
                    {#if planMergeRequest.type === 'incoming'}
                      {planMergeRequest.plan_snapshot_supplying_changes.name}
                    {:else if planMergeRequest.type === 'outgoing'}
                      {planMergeRequest.plan_receiving_changes.name}
                    {/if}
                  </div>
                  <PlanMergeRequestStatusBadge status={planMergeRequest.status} />
                </div>

                {#if planMergeRequest.status === 'pending'}
                  <button on:click={() => onReviewOrWithdraw(planMergeRequest)} class="st-button secondary">
                    {#if planMergeRequest.pending}
                      {planMergeRequest.type === 'outgoing' ? 'Withdrawing...' : 'Reviewing...'}
                    {:else}
                      {planMergeRequest.type === 'outgoing' ? 'Withdraw' : 'Review'}
                    {/if}
                  </button>
                {/if}
              </div>
              <div class="plan-merge-request-row">
                <UserBadge username={planMergeRequest.requester_username} />
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="plan-merge-requests-empty st-typography-label">No merge requests found</div>
      {/if}
    </div>
  </ModalContent>
</Modal>

<style>
  .plan-merge-requests-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }

  .plan-merge-requests-row {
    border-bottom: 1px solid var(--st-gray-15);
    display: flex;
    flex-direction: column;
    padding-left: 8px;
  }

  .plan-merge-requests-tabs {
    display: inherit;
  }

  .plan-merge-requests-tabs button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    gap: 4px;
    outline: none;
    padding: 12px 8px;
    text-align: left;
    white-space: nowrap;
  }

  .plan-merge-requests-tabs button > span:first-child {
    opacity: 0.5;
  }

  .plan-merge-requests-tabs button.plan-merge-requests-tab-active span {
    opacity: 1 !important;
  }

  .plan-merge-requests-tabs button:hover span:first-child {
    opacity: 0.7;
  }

  .plan-merge-requests-tabs .st-badge {
    background: #e5b300;
    color: var(--st-white);
  }

  .plan-merge-requests-tabs .plan-merge-request {
    align-items: center;
    display: grid;
    grid-template-rows: auto auto;
  }

  .plan-merge-request-row {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: space-between;
  }

  .plan-merge-request-filters {
    display: flex;
    gap: 12px;
    padding: 10px 8px;
  }

  .plan-merge-request-filter {
    display: flex;
    gap: 6px;
  }

  .plan-merge-request-filter input {
    margin: 0;
  }

  .plan-merge-request-filter .st-typography-label {
    color: var(--st-gray-60);
    user-select: none;
  }

  .plan-merge-requests {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: auto;
    padding: 16px;
  }

  .plan-merge-request {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .plan-merge-request-status {
    background: var(--st-gray-15);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    grid-area: 4px;
    padding: 4px 4px;
  }

  .plan-merge-request-row-metadata {
    align-items: center;
    display: flex;
    gap: 8px;
    overflow: hidden;
  }

  .plan-merge-request-row-branch-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .plan-merge-requests-empty {
    padding: 16px;
  }
</style>
