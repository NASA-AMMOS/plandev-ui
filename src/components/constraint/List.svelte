<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Chip from '../stellar/Chip.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';
  import ConfirmModal from '../../components/modals/Confirm.svelte';
  import { tooltip } from '../../utilities/tooltip';

  export let modelConstraints: Constraint[] = [];
  export let planConstraints: Constraint[] = [];

  const dispatch = createEventDispatcher();

  let confirmDeleteConstraint: ConfirmModal | null = null;

  function deleteConstraint(event: CustomEvent<Constraint>) {
    const { detail: constraint } = event;
    dispatch('delete', constraint.id);
  }

  function editConstraint(constraint: Constraint) {
    dispatch('edit', constraint);
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
        {#if modelConstraints.length}
          {#each modelConstraints as constraint}
            <ListItem>
              {constraint.name}
              <span slot="suffix">
                <button
                  class="st-button icon"
                  on:click|stopPropagation={() => editConstraint(constraint)}
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
        {#if planConstraints.length}
          {#each planConstraints as constraint}
            <ListItem>
              {constraint.name}
              <span slot="suffix">
                <button
                  class="st-button icon"
                  on:click|stopPropagation={() => editConstraint(constraint)}
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
  on:confirm={deleteConstraint}
/>
