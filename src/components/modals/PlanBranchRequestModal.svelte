<svelte:options immutable={true} />

<script lang="ts">
  import BranchIcon from '@nasa-jpl/stellar/icons/branch.svg?component';
  import MergeIcon from '@nasa-jpl/stellar/icons/merge.svg?component';
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let action: PlanBranchRequestAction = 'merge';
  export let height: number = 200;
  export let plan: Plan;
  export let width: number = 560;

  const dispatch = createEventDispatcher();

  let actionHeader: string = '';
  let actionButtonText: string = '';
  let createButtonDisabled: boolean = true;
  let modalHeader: string = '';
  let planList: Pick<PlanSchema, 'id' | 'name'>[] = [];
  let selectedPlanId: number = null;

  $: createButtonDisabled = selectedPlanId === null;
  $: selectedPlanId = plan.parent_plan.id;
  $: planList = [plan.parent_plan];
  $: if (action === 'merge') {
    modalHeader = 'Merge Request';
    actionHeader = 'Merge to';
    actionButtonText = 'Create Merge Request';
  } else {
    modalHeader = 'Pull Changes';
    actionHeader = 'Pull changes from';
    actionButtonText = 'Review Changes';
  }

  function create() {
    if (!createButtonDisabled) {
      if (action === 'merge') {
        dispatch('create', { source_plan_id: plan.id, target_plan_id: selectedPlanId });
      } else {
        dispatch('create', { source_plan_id: selectedPlanId, target_plan_id: plan.id });
      }
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      create();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>{modalHeader}</ModalHeader>
  <ModalContent>
    <div class="branch-action-container">
      <div>
        <div class="branch-header">Current branch</div>
        <div class="branch-name"><BranchIcon />{plan.name}</div>
      </div>
      <div>
        <div class="branch-header">{actionHeader}</div>
        <div class="branch-name">
          <MergeIcon />
          <select bind:value={selectedPlanId} class="st-select w-100" disabled name="sequences">
            {#each planList as plan}
              <option value={plan.id}>
                {plan.name}
              </option>
            {/each}
          </select>
        </div>
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={createButtonDisabled} on:click={create}>{actionButtonText}</button>
  </ModalFooter>
</Modal>

<style>
  .branch-action-container {
    display: grid;
    grid-template-rows: auto auto;
    height: 100%;
    row-gap: 24px;
  }

  .branch-name {
    align-items: center;
    display: flex;
    flex-flow: row;
    gap: 9px;
    margin-top: 20px;
  }
</style>
