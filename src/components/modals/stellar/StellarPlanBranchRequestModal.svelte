<svelte:options immutable={true} />

<script lang="ts">
  import BranchIcon from '@nasa-jpl/stellar/icons/branch.svg?component';
  import MergeIcon from '@nasa-jpl/stellar/icons/merge.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { Plan, PlanBranchRequestAction, PlanForMerging } from '../../../types/plan';
  import AlertError from '../../ui/AlertError.svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let action: PlanBranchRequestAction = 'merge';
  export let plan: Plan;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: {
      confirm: boolean;
      value?:
        | {
            source_plan: PlanForMerging;
            target_plan: PlanForMerging;
          }
        | {
            source_plan: PlanForMerging;
            target_plan: PlanForMerging;
          };
    };
  }>();

  let actionHeader: string = '';
  let actionButtonText: string = '';
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
  $: if (selectedPlan && plan.parent_plan && plan.model) {
    planModelsCompatible = plan.model.id === plan.parent_plan.model.id;
  } else {
    planModelsCompatible = true;
  }
  $: createButtonDisabled = selectedPlanId === null || !planModelsCompatible;

  function handleCancel() {
    open = false;
  }

  function handleCreate() {
    if (!createButtonDisabled && selectedPlan !== null) {
      open = false;
      if (action === 'merge') {
        dispatch('resolve', {
          confirm: true,
          value: { source_plan: plan as PlanForMerging, target_plan: selectedPlan },
        });
      } else {
        dispatch('resolve', {
          confirm: true,
          value: { source_plan: selectedPlan, target_plan: plan as PlanForMerging },
        });
      }
    }
  }
</script>

<StellarDialog bind:open size="md" title={modalHeader} on:close>
  <div class="grid gap-6 py-2">
    {#if !planModelsCompatible}
      <AlertError
        fullError={`Current branch's model (ID: ${plan.model_id}) does not match target plan's model (ID: ${plan.parent_plan?.model_id})`}
        error="Cannot create merge request due to mismatch in source and target plan models"
      />
    {/if}
    <div>
      <div class="text-sm font-medium text-muted-foreground">Current branch</div>
      <div class="mt-2 flex items-center gap-2">
        <BranchIcon class="h-4 w-4" />
        <span>{plan.name}</span>
      </div>
    </div>
    <div>
      <div class="text-sm font-medium text-muted-foreground">{actionHeader}</div>
      <div class="mt-2 flex items-center gap-2">
        <MergeIcon class="h-4 w-4" />
        <select
          bind:value={selectedPlanId}
          disabled
          class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
        >
          {#each planList as planOption}
            <option value={planOption.id}>
              {planOption.name}
            </option>
          {/each}
        </select>
      </div>
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText={actionButtonText}
      confirmDisabled={createButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleCreate}
    />
  </svelte:fragment>
</StellarDialog>
