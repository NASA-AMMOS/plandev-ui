<svelte:options immutable={true} />

<script lang="ts">
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';

  export let constraint: Constraint;
</script>

<div class="constraint-list-item">
  <div class="constraint-title">
    {#if constraint.plan_id !== null}
      <i class="bi bi-calendar-range" />
    {:else}
      <i class="bi bi-bar-chart" />
    {/if}
    {constraint.name}
  </div>
  <div class="constraint-actions">
    <button
      class="st-button icon"
      on:click|stopPropagation={() => window.open(`/constraints/edit/${constraint.id}`, '_blank')}
      use:tooltip={{ content: 'Edit Constraint', placement: 'left' }}
    >
      <i class="bi bi-pencil" />
    </button>
    <button
      class="st-button icon"
      on:click|stopPropagation={() => effects.deleteConstraint(constraint.id)}
      use:tooltip={{ content: 'Delete Constraint', placement: 'left' }}
    >
      <i class="bi bi-trash" />
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
