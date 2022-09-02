<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import PenIcon from '@nasa-jpl/stellar/icons/svg/pen.svg?component';
  import PlanIcon from '@nasa-jpl/stellar/icons/svg/plan.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/svg/trash.svg?component';
  import BarChartIcon from 'bootstrap-icons/icons/bar-chart.svg?component';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';

  export let constraint: Constraint;
</script>

<div class="constraint-list-item">
  <div class="constraint-title">
    {#if constraint.plan_id !== null}
      <PlanIcon />
    {:else}
      <BarChartIcon />
    {/if}
    {constraint.name}
  </div>
  <div class="constraint-actions">
    <button
      class="st-button icon"
      on:click|stopPropagation={() => window.open(`${base}/constraints/edit/${constraint.id}`, '_blank')}
      use:tooltip={{ content: 'Edit Constraint', placement: 'left' }}
    >
      <PenIcon />
    </button>
    <button
      class="st-button icon"
      on:click|stopPropagation={() => effects.deleteConstraint(constraint.id)}
      use:tooltip={{ content: 'Delete Constraint', placement: 'left' }}
    >
      <TrashIcon />
    </button>
  </div>
</div>

<style>
  .constraint-actions {
    visibility: hidden;
  }

  .constraint-list-item:hover .constraint-actions {
    visibility: visible;
  }

  .constraint-list-item {
    align-items: center;
    border: 1px solid var(--st-gray-30);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    padding-left: 6px;
  }

  .constraint-title {
    align-items: center;
    display: flex;
    gap: 6px;
  }
</style>
