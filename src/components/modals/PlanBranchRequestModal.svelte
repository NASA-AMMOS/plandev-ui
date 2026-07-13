<svelte:options immutable={true} />

<script lang="ts">
  import { Alert } from '@nasa-jpl/stellar-svelte';
  import BranchIcon from '@nasa-jpl/stellar/icons/branch.svg?component';
  import MergeIcon from '@nasa-jpl/stellar/icons/merge.svg?component';
  import { TriangleAlert } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { Plan, PlanBranchRequestAction, PlanForMerging } from '../../types/plan';
  import { getDoyTime, getDoyTimeFromInterval, getIntervalInMs } from '../../utilities/time';
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
          source_plan: PlanForMerging;
          target_plan: PlanForMerging;
        }
      | {
          source_plan: PlanForMerging;
          target_plan: PlanForMerging;
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
  let timeBoundsCompatible: boolean = true;

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
  $: if (selectedPlan && plan.parent_plan && plan.model) {
    planModelsCompatible = plan.model.id === plan.parent_plan.model.id;
  } else {
    planModelsCompatible = true;
  }
  $: if (selectedPlan && plan.parent_plan) {
    timeBoundsCompatible =
      new Date(plan.start_time).getTime() === new Date(plan.parent_plan.start_time).getTime() &&
      getIntervalInMs(plan.duration) === getIntervalInMs(plan.parent_plan.duration);
  } else {
    timeBoundsCompatible = true;
  }
  $: createButtonDisabled = selectedPlanId === null || !planModelsCompatible || !timeBoundsCompatible;

  $: sourceStartTime = getDoyTime(new Date(plan.start_time), false);
  $: sourceEndTime = getDoyTimeFromInterval(plan.start_time, plan.duration, false);
  $: targetStartTime = plan.parent_plan ? getDoyTime(new Date(plan.parent_plan.start_time), false) : '';
  $: targetEndTime = plan.parent_plan
    ? getDoyTimeFromInterval(plan.parent_plan.start_time, plan.parent_plan.duration, false)
    : '';

  function create() {
    if (!createButtonDisabled && selectedPlan !== null) {
      if (action === 'merge') {
        dispatch('create', { source_plan: plan as PlanForMerging, target_plan: selectedPlan });
      } else {
        dispatch('create', { source_plan: selectedPlan, target_plan: plan as PlanForMerging });
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

<Modal {height} {width} on:close>
  <ModalHeader on:close>{modalHeader}</ModalHeader>
  <ModalContent>
    <div class="branch-action-container">
      {#if !planModelsCompatible}
        <Alert.Root variant="destructive" class="mb-3">
          <TriangleAlert class="h-4 w-4" />
          <Alert.Title>Invalid Merge Request</Alert.Title>
          <Alert.Description>
            Current branch's model (ID: {plan.model_id}) does not match target plan's model (ID: {plan.parent_plan
              ?.model_id})
          </Alert.Description>
        </Alert.Root>
      {/if}
      {#if !timeBoundsCompatible}
        <Alert.Root variant="destructive" class="mb-3">
          <TriangleAlert class="h-4 w-4" />
          <Alert.Title>Invalid Merge Request</Alert.Title>
          <Alert.Description>
            Current branch (start: {sourceStartTime}, end: {sourceEndTime}) and target plan (start: {targetStartTime},
            end: {targetEndTime}) have different time bounds.
          </Alert.Description>
        </Alert.Root>
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
