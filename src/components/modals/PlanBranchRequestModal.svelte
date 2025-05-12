<svelte:options immutable={true} />

<script lang="ts">
  import BranchIcon from '@nasa-jpl/stellar/icons/branch.svg?component';
  import MergeIcon from '@nasa-jpl/stellar/icons/merge.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { Plan, PlanBranchRequestAction, PlanForMerging } from '../../types/plan';
  import AlertError from '../ui/AlertError.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let action: PlanBranchRequestAction = 'merge';
  export let height: number | string = 'min-content';
  export let plan: Plan;
  export let width: number | string = 560;

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
  let planModelsCompatible: boolean = true;

  $: selectedPlanId = plan?.parent_plan?.id ?? null;
  $: selectedPlan = planList.find(({ id }) => id === selectedPlanId) ?? null;
  $: planList = plan.parent_plan ? [plan.parent_plan] : [];
  $: if (action === 'merge') {
    modalHeader = 'Merge Request';
    actionHeader = 'Merge to';
    actionButtonText = 'Create Merge Request';
  } else {
    modalHeader = 'Pull Changes';
    actionHeader = 'Pull changes from';
    actionButtonText = 'Review Changes';
  }
  $: if (selectedPlan && plan.parent_plan) {
    planModelsCompatible = plan.model.id === plan.parent_plan.model.id;
  } else {
    planModelsCompatible = true;
  }
  $: createButtonDisabled = selectedPlanId === null || !planModelsCompatible;

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
      {#if !planModelsCompatible}
        <AlertError
          fullError={`Current branch's model (ID: ${plan.model_id}) does not match target plan's model (ID: ${plan.parent_plan?.model_id})`}
          error="Cannot create merge request due to mismatch in source and target plan models"
        />
      {/if}
      <div>
        <div class="branch-header">Current branch</div>
        <div class="branch-name"><BranchIcon />{plan.name}</div>
      </div>
      <div>
        <div class="branch-header">{actionHeader}</div>
        <div class="branch-name">
          <MergeIcon />
          <select bind:value={selectedPlanId} class="st-select w-full" disabled name="sequences">
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
    margin-top: 8px;
  }
</style>
