<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { constraintsAll, constraintsColumns } from '../../stores/constraints';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import Table from '../ui/Table.svelte';
  import ConstraintEditor from './ConstraintEditor.svelte';

  export let initialPlans: PlanList[] = [];

  let constraintModelId: number | null = null;
  let filterText: string = '';
  let filteredConstraints: Constraint[] = [];
  let selectedConstraint: Constraint | null = null;

  $: filteredConstraints = $constraintsAll.filter(constraint => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${constraint.id}`.includes(filterTextLowerCase);
    const includesName = constraint.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });
  $: if (selectedConstraint !== null) {
    const found = $constraintsAll.findIndex(constraint => constraint.id === selectedConstraint.id);
    if (found === -1) {
      selectedConstraint = null;
    }
  }
  $: constraintModelId = getConstraintModelId(selectedConstraint);

  async function deleteConstraint(id: number) {
    const success = await effects.deleteConstraint(id);

    if (success) {
      filteredConstraints = filteredConstraints.filter(constraint => constraint.id !== id);

      if (id === selectedConstraint?.id) {
        selectedConstraint = null;
      }
    }
  }

  function getConstraintModelId(selectedConstraint: Constraint | null): number | null {
    if (selectedConstraint !== null) {
      const { model_id, plan_id } = selectedConstraint;

      if (plan_id !== null) {
        const plan = initialPlans.find(plan => plan.id === plan_id);
        if (plan) {
          return plan.model_id;
        }
      } else if (model_id !== null) {
        return model_id;
      }
    }

    return null;
  }

  function toggleConstraint(event: CustomEvent<Constraint>) {
    const { detail: clickedConstraint } = event;

    if (selectedConstraint?.id === clickedConstraint.id) {
      selectedConstraint = null;
    } else {
      selectedConstraint = clickedConstraint;
    }
  }
</script>

<CssGrid bind:columns={$constraintsColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <Chip>Constraints</Chip>

      <Input>
        <input bind:value={filterText} class="st-input" placeholder="Filter constraints" style="width: 300px" />
      </Input>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto('/constraints/new')}> New </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if filteredConstraints.length}
        <Table
          let:currentRow
          columnDefs={[
            { field: 'id', name: 'ID', sortable: true },
            { field: 'name', name: 'Name', sortable: true },
            { field: 'model_id', name: 'Model ID', sortable: true },
            { field: 'plan_id', name: 'Plan ID', sortable: true },
          ]}
          rowActions
          rowData={filteredConstraints}
          rowSelectionMode="single"
          selectedRowId={selectedConstraint?.id}
          on:rowClick={toggleConstraint}
        >
          <div slot="actions-cell">
            <button
              class="st-button icon"
              on:click|stopPropagation={() => goto(`/constraints/edit/${currentRow.id}`)}
              use:tooltip={{ content: 'Edit Constraint', placement: 'bottom' }}
            >
              <i class="bi bi-pencil" />
            </button>
            <button
              class="st-button icon"
              on:click|stopPropagation={() => deleteConstraint(currentRow.id)}
              use:tooltip={{ content: 'Delete Constraint', placement: 'bottom' }}
            >
              <i class="bi bi-trash" />
            </button>
          </div>
        </Table>
      {:else}
        No Constraints Found
      {/if}
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <ConstraintEditor
    constraintDefinition={selectedConstraint?.definition ?? 'No Constraint Selected'}
    {constraintModelId}
    readOnly={true}
    title="Constraint - Definition Editor (Read-only)"
  />
</CssGrid>
