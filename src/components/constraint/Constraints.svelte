<svelte:options immutable={true} />

<script lang="ts">
  import {
    checkConstraintsStatus,
    modelConstraints,
    planConstraints,
    selectedConstraint,
  } from '../../stores/constraints';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';

  export let gridId: number;
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Constraints" />
    <StatusBadge
      status={$checkConstraintsStatus}
      title="Check Constraints"
      titleWidth="135px"
      on:click={() => effects.checkConstraints()}
    />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <details open>
      <summary class="p-1">Model Constraints</summary>
      <div class="m-1">
        {#if $modelConstraints.length}
          {#each $modelConstraints as constraint}
            <ListItem>
              {constraint.name}
              <span slot="suffix">
                <button
                  class="st-button icon"
                  on:click|stopPropagation={() => ($selectedConstraint = constraint)}
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
              </span>
            </ListItem>
          {/each}
        {:else}
          <div class="p-2">No Model Constraints Found</div>
        {/if}
      </div>
    </details>

    <details open>
      <summary class="p-1">Plan Constraints</summary>
      <div class="m-1">
        {#if $planConstraints.length}
          {#each $planConstraints as constraint}
            <ListItem>
              {constraint.name}
              <span slot="suffix">
                <button
                  class="st-button icon"
                  on:click|stopPropagation={() => ($selectedConstraint = constraint)}
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
              </span>
            </ListItem>
          {/each}
        {:else}
          <div class="p-2">No Plan Constraints Found</div>
        {/if}
      </div>
    </details>
  </svelte:fragment>
</Panel>
