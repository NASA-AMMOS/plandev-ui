<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import BranchIcon from '@nasa-jpl/stellar/icons/branch.svg?component';
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import type { User } from '../../types/app';
  import type { Plan } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { showPlanBranchesModal, showPlanMergeRequestsModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import Menu from '../menus/Menu.svelte';
  import MenuItem from '../menus/MenuItem.svelte';

  export let plan: Plan;
  export let user: User | null;

  let hasCreatePermission: boolean = false;
  let planMenu: Menu;

  $: hasCreatePermission = featurePermissions.planBranch.canCreateRequest(user, plan);

  function createMergePlanBranchRequest() {
    effects.createPlanBranchRequest(plan, 'merge', user);
  }

  function createPlanBranch() {
    effects.createPlanBranch(plan, user);
  }

  function createPlanSnapshot() {
    effects.createPlanSnapshot(plan, user);
  }

  function viewSnapshotHistory() {
    // TODO: open snapshot panel
  }

  function showPlanBranches() {
    showPlanBranchesModal(plan);
  }

  function showPlanMergeRequests() {
    showPlanMergeRequestsModal(user);
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
    <Menu bind:this={planMenu}>
      <MenuItem on:click={createPlanBranch}>
        <div class="column-name">Create branch</div>
      </MenuItem>
      <MenuItem on:click={showPlanMergeRequests}>
        <div class="column-name">View merge requests</div>
      </MenuItem>
      {#if plan.parent_plan !== null}
        <hr class="menu-divider" />
        <MenuItem
          on:click={createMergePlanBranchRequest}
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasCreatePermission,
                permissionError: 'You do not have permission to create a merge request',
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
      <hr class="menu-divider" />
      <MenuItem on:click={createPlanSnapshot}>
        <div class="column-name">Take Snapshot</div>
      </MenuItem>
      <MenuItem on:click={viewSnapshotHistory}>
        <div class="column-name">View Snapshot History</div>
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
  hr.menu-divider {
    opacity: 0.3;
    width: 90%;
  }

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
</style>
