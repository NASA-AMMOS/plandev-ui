<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import BranchIcon from '@nasa-jpl/stellar/icons/branch.svg?component';
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { planReadOnly } from '../../stores/plan';
  import { viewTogglePanel } from '../../stores/views';
  import type { User } from '../../types/app';
  import type { Plan } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { showPlanBranchesModal, showPlanMergeRequestsModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { exportPlan } from '../../utilities/plan';
  import Menu from '../menus/Menu.svelte';
  import MenuItem from '../menus/MenuItem.svelte';
  import ProgressRadial from '../ui/ProgressRadial.svelte';
  import MenuDivider from './MenuDivider.svelte';

  export let plan: Plan;
  export let user: User | null;

  let hasCreateMergeRequestPermission: boolean = false;
  let hasCreatePlanBranchPermission: boolean = false;
  let hasCreateSnapshotPermission: boolean = false;
  let planMenu: Menu;
  let planExportAbortController: AbortController | null = null;
  let planExportProgress: number | null = null;

  $: hasCreateMergeRequestPermission = plan.parent_plan
    ? featurePermissions.planBranch.canCreateRequest(
        user,
        plan,
        {
          ...plan.parent_plan,
          model_id: plan.model_id,
        },
        plan.model,
      ) && !$planReadOnly
    : false;
  $: hasCreatePlanBranchPermission =
    featurePermissions.planBranch.canCreateBranch(user, plan, plan.model) && !$planReadOnly;
  $: hasCreateSnapshotPermission = featurePermissions.planSnapshot.canCreate(user, plan, plan.model) && !$planReadOnly;

  function createMergePlanBranchRequest() {
    effects.createPlanBranchRequest(plan, 'merge', user);
    planMenu.hide();
  }

  function createPlanBranch() {
    effects.createPlanBranch(plan, user);
    planMenu.hide();
  }

  function createPlanSnapshot() {
    effects.createPlanSnapshot(plan, user);
    planMenu.hide();
  }

  async function onExportPlan() {
    if (planExportAbortController) {
      planExportAbortController.abort();
    }

    planExportProgress = 0;
    planExportAbortController = new AbortController();

    if (planExportAbortController && !planExportAbortController.signal.aborted) {
      await exportPlan(
        plan,
        user,
        (progress: number) => {
          planExportProgress = progress;
        },
        undefined,
        planExportAbortController.signal,
      );
    }
    planExportProgress = null;
  }

  function onCancelExportPlan() {
    planExportAbortController?.abort();
    planExportAbortController = null;
    planExportProgress = null;
  }

  function viewSnapshotHistory() {
    viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'PlanMetadataPanel' } });
    planMenu.hide();
  }

  function showPlanBranches() {
    showPlanBranchesModal(plan);
  }

  function showPlanMergeRequests() {
    showPlanMergeRequestsModal(user);
    planMenu.hide();
  }
</script>

<div class="plan-menu-container">
  {#if plan.parent_plan !== null}
    <div>
      <a href={`${base}/plans/${plan.parent_plan.id}`} class="link st-typography-medium">{plan.parent_plan.name}</a>
    </div>
    <BranchIcon />
  {/if}

  <div class="plan-menu st-typography-medium" role="none" on:click|stopPropagation={() => planMenu.toggle()}>
    <div class="plan-title">{plan.name}<ChevronDownIcon /></div>
    <Menu hideAfterClick={false} bind:this={planMenu}>
      <MenuItem
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasCreatePlanBranchPermission,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to create a plan branch',
            },
          ],
        ]}
        on:click={createPlanBranch}
      >
        <div class="column-name">Create branch</div>
      </MenuItem>
      <MenuItem on:click={showPlanMergeRequests}>
        <div class="column-name">View merge requests</div>
      </MenuItem>
      {#if plan.parent_plan !== null}
        <MenuDivider />
        <MenuItem
          on:click={createMergePlanBranchRequest}
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasCreateMergeRequestPermission,
                permissionError: $planReadOnly
                  ? PlanStatusMessages.READ_ONLY
                  : 'You do not have permission to create a merge request',
              },
            ],
          ]}
        >
          <div class="column-name">Create merge request</div>
        </MenuItem>
        <MenuItem on:click={() => goto(`${base}/plans/${plan?.parent_plan?.id}`)}>
          <div class="column-name">Open parent plan</div>
        </MenuItem>
      {/if}
      <MenuDivider />
      <MenuItem
        on:click={createPlanSnapshot}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasCreateSnapshotPermission,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to create a plan snapshot',
            },
          ],
        ]}
      >
        <div class="column-name">Take Snapshot</div>
      </MenuItem>
      <MenuItem on:click={viewSnapshotHistory}>
        <div class="column-name">View Snapshot History</div>
      </MenuItem>
      <MenuDivider />
      <MenuItem on:click={planExportProgress === null ? onExportPlan : onCancelExportPlan}>
        {#if planExportProgress === null}
          Export plan as .json
        {:else}
          <div class="cancel-plan-export">
            Cancel plan export
            <ProgressRadial progress={planExportProgress} size={16} strokeWidth={1} />
          </div>
        {/if}
      </MenuItem>
    </Menu>
  </div>
  {#if plan.child_plans.length > 0}
    <div class="plan-branches st-typography-medium" on:click|stopPropagation={showPlanBranches} role="none">
      {plan.child_plans.length} branch{plan.child_plans.length > 1 ? 'es' : ''}
    </div>
  {/if}
</div>

<style>
  .plan-menu-container {
    align-items: center;
    display: flex;
    flex-flow: row;
    gap: 20px;
  }

  .link {
    color: var(--st-white);
    font-size: 14px;
    opacity: 0.7;
    text-decoration: none;
  }

  .link:hover {
    opacity: 1;
  }

  .plan-menu {
    --aerie-menu-item-template-columns: min-content;
    align-items: center;
    cursor: pointer;
    display: flex;
    font-size: 13px;
    gap: 5px;
    height: 24px;
    justify-content: center;
    position: relative;
    user-select: none;
  }

  .plan-title {
    align-items: center;
    color: var(--st-white);
    display: flex;
    flex-flow: row;
    font-size: 14px;
    gap: 4px;
  }

  .plan-branches {
    color: var(--st-white);
    cursor: pointer;
    user-select: none;
  }

  .cancel-plan-export {
    --progress-radial-background: var(--st-gray-20);
    align-items: center;
    column-gap: 0.25rem;
    display: flex;
  }
</style>
