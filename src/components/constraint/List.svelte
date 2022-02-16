<svelte:options immutable={true} />

<script lang="ts">
  import Chip from '../stellar/Chip.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';
  import ConfirmModal from '../../components/modals/Confirm.svelte';
  import {
    deleteConstraint,
    modelConstraints,
    planConstraints,
    selectedConstraint,
  } from '../../stores/constraints';
  import { constraintEditorPanel } from '../../stores/panels';
  import { SimulationStatus, simulationStatus } from '../../stores/simulation';
  import { tooltip } from '../../utilities/tooltip';

  let confirmDeleteConstraint: ConfirmModal | null = null;

  async function onDeleteConstraint(event: CustomEvent<Constraint>) {
    const { detail: constraint } = event;
    await deleteConstraint(constraint.id);
    simulationStatus.update(SimulationStatus.Dirty);
  }

  function onEditConstraint(constraint: Constraint) {
    $selectedConstraint = constraint;
    constraintEditorPanel.show();
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Constraint List</Chip>
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
                  on:click|stopPropagation={() => onEditConstraint(constraint)}
                  use:tooltip={{
                    content: 'Edit Constraint',
                    placement: 'left',
                  }}
                >
                  <i class="bi bi-pencil" />
                </button>
                <button
                  class="st-button icon"
                  on:click|stopPropagation={() =>
                    confirmDeleteConstraint.modal.show(constraint)}
                  use:tooltip={{
                    content: 'Delete Constraint',
                    placement: 'left',
                  }}
                >
                  <i class="bi bi-trash" />
                </button>
              </span>
            </ListItem>
          {/each}
        {:else}
          <ListItem>No Model Constraints Found</ListItem>
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
                  on:click|stopPropagation={() => onEditConstraint(constraint)}
                  use:tooltip={{
                    content: 'Edit Constraint',
                    placement: 'left',
                  }}
                >
                  <i class="bi bi-pencil" />
                </button>
                <button
                  class="st-button icon"
                  on:click|stopPropagation={() =>
                    confirmDeleteConstraint.modal.show(constraint)}
                  use:tooltip={{
                    content: 'Delete Constraint',
                    placement: 'left',
                  }}
                >
                  <i class="bi bi-trash" />
                </button>
              </span>
            </ListItem>
          {/each}
        {:else}
          <ListItem>No Plan Constraints Found</ListItem>
        {/if}
      </div>
    </details>
  </svelte:fragment>
</Panel>

<ConfirmModal
  bind:this={confirmDeleteConstraint}
  confirmText="Delete"
  message="Are you sure you want to delete this constraint?"
  title="Delete Constraint"
  on:confirm={onDeleteConstraint}
/>
