<svelte:options immutable={true} />

<script lang="ts">
  import Chip from '../ui/Chip.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import type Modal from '../modals/Modal.svelte';
  import {
    constraintActions,
    modelConstraints,
    planConstraints,
    selectedConstraint,
  } from '../../stores/constraints';
  import { constraintEditorPanel } from '../../stores/panels';
  import { simulationStatus } from '../../stores/simulation';
  import { Status } from '../../utilities/enums';
  import { tooltip } from '../../utilities/tooltip';

  let confirmDeleteConstraintModal: Modal;

  async function onDeleteConstraint(event: CustomEvent<Constraint>) {
    const { detail: constraint } = event;
    await constraintActions.deleteConstraint(constraint.id);
    simulationStatus.update(Status.Dirty);
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
                    confirmDeleteConstraintModal.show(constraint)}
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
                    confirmDeleteConstraintModal.show(constraint)}
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
  on:confirm={onDeleteConstraint}
/>
