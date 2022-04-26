<svelte:options immutable={true} />

<script lang="ts">
  import GridMenu from '../menus/GridMenu.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import type Modal from '../modals/Modal.svelte';
  import { constraintActions, modelConstraints, planConstraints } from '../../stores/constraints';
  import { tooltip } from '../../utilities/tooltip';

  export let gridId: number;

  let confirmDeleteConstraintModal: Modal;
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Constraints" />
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
                  on:click|stopPropagation={() => constraintActions.selectConstraint(constraint)}
                  use:tooltip={{ content: 'Edit Constraint', placement: 'left' }}
                >
                  <i class="bi bi-pencil" />
                </button>
                <button
                  class="st-button icon"
                  on:click|stopPropagation={() => confirmDeleteConstraintModal.show(constraint)}
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
                  on:click|stopPropagation={() => constraintActions.selectConstraint(constraint)}
                  use:tooltip={{ content: 'Edit Constraint', placement: 'left' }}
                >
                  <i class="bi bi-pencil" />
                </button>
                <button
                  class="st-button icon"
                  on:click|stopPropagation={() => confirmDeleteConstraintModal.show(constraint)}
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

<ConfirmModal
  bind:modal={confirmDeleteConstraintModal}
  confirmText="Delete"
  message="Are you sure you want to delete this constraint?"
  title="Delete Constraint"
  on:confirm={({ detail: constraint }) => constraintActions.deleteConstraint(constraint.id)}
/>
