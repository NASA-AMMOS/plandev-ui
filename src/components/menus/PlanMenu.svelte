<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import BranchIcon from '@nasa-jpl/stellar/icons/branch.svg?component';
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import effects from '../../utilities/effects';
  import { showPlanBranchesModal } from '../../utilities/modal';
  import Menu from '../menus/Menu.svelte';
  import MenuItem from '../menus/MenuItem.svelte';

  export let plan: Plan;

  let planMenu: Menu;

  function createPlanBranch() {
    effects.createPlanBranch(plan);
  }

  function showPlanBranches() {
    showPlanBranchesModal(plan);
  }
</script>

<div class="plan-menu-container">
  {#if plan.parent_plan !== null}
    <div>
      <a href={`${base}/plans/${plan.parent_plan.id}`} class="link">{plan.parent_plan.name}</a>
    </div>
    <BranchIcon />
  {/if}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="plan-menu st-typography-medium" on:click|stopPropagation={() => planMenu.toggle()}>
    <div class="plan-title">{plan.name}<ChevronDownIcon /></div>
    <Menu bind:this={planMenu}>
      <MenuItem on:click={createPlanBranch}>
        <div class="column-name">Create branch</div>
      </MenuItem>
      <MenuItem
        on:click={() => {
          console.log('See merge requests');
        }}
      >
        <div class="column-name">See merge requests</div>
      </MenuItem>
    </Menu>
  </div>
  {#if plan.child_plans.length > 0}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="plan-branches" on:click|stopPropagation={showPlanBranches}>
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
    color: var(--st-gray-30);
    text-decoration: none;
  }

  .link:hover {
    color: var(--st-gray-white);
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
    font-weight: 500;
  }

  .plan-branches {
    color: var(--st-white);
    cursor: pointer;
  }
</style>
