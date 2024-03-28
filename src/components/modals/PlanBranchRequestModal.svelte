<svelte:options immutable={true} />

<script lang="ts">
  import BranchIcon from '@nasa-jpl/stellar/icons/branch.svg?component';
  import MergeIcon from '@nasa-jpl/stellar/icons/merge.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { Plan, PlanBranchRequestAction, PlanForMerging } from '../../types/plan';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let action: PlanBranchRequestAction = 'merge';
  export let height: number = 200;
  export let plan: Plan;
  export let width: number = 560;

  const dispatch = createEventDispatcher<{
    close: void;
    create:
      | {
          source_plan: Plan;
          target_plan: PlanForMerging;
        }
      | {
          source_plan: PlanForMerging;
          target_plan: Plan;
        };
  }>();

  let actionHeader: string = '';
  let actionButtonText: string = '';
  let createButtonDisabled: boolean = true;
  let modalHeader: string = '';
  let planList: PlanForMerging[] = [];
  let selectedPlan: PlanForMerging | null = null;
  let selectedPlanId: number | null = null;

  $: createButtonDisabled = selectedPlanId === null;
  $: selectedPlanId = plan?.parent_plan?.id ?? null;
  $: selectedPlan = planList.find(({ id }) => id === selectedPlanId) ?? null;
  $: planList = plan.parent_plan
    ? [
        {
          ...plan.parent_plan,
          model: plan.model,
          model_id: plan.model_id,
        },
      ]
    : [];
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
    if (!createButtonDisabled && selectedPlan !== null) {
      if (action === 'merge') {
        dispatch('create', { source_plan: plan, target_plan: selectedPlan });
      } else {
        dispatch('create', { source_plan: selectedPlan, target_plan: plan });
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
