<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams } from 'ag-grid-community';
  import { constraintsAll, constraintsColumns } from '../../stores/constraints';
  import type { User } from '../../types/app';
  import type { Constraint } from '../../types/constraint';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { PlanSlim } from '../../types/plan';
  import effects from '../../utilities/effects';
  import Input from '../form/Input.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import ConstraintEditor from './ConstraintEditor.svelte';

  export let user: User | null;

  type CellRendererParams = {
    deleteConstraint: (constraint: Constraint) => void;
    editConstraint: (constraint: Constraint) => void;
  };
  type ConstraintsCellRendererParams = ICellRendererParams<Constraint> & CellRendererParams;

  export let initialPlans: PlanSlim[] = [];

  const columnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 60,
    },
    { field: 'name', filter: 'text', headerName: 'Name', resizable: true, sortable: true },
    {
      field: 'model_id',
      filter: 'number',
      headerName: 'Model ID',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 95,
    },
    {
      field: 'plan_id',
      filter: 'number',
      headerName: 'Plan ID',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 80,
    },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ConstraintsCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteConstraint,
            deleteTooltip: {
              content: 'Delete Constraint',
              placement: 'bottom',
            },
            editCallback: params.editConstraint,
            editTooltip: {
              content: 'Edit Constraint',
              placement: 'bottom',
            },
            rowData: params.data,
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteConstraint,
        editConstraint,
      } as CellRendererParams,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 55,
    },
  ];

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
    const found = $constraintsAll.findIndex(constraint => constraint.id === selectedConstraint?.id);
    if (found === -1) {
      selectedConstraint = null;
    }
  }
  $: constraintModelId = getConstraintModelId(selectedConstraint);

  async function deleteConstraint({ id }: Pick<Constraint, 'id'>) {
    const success = await effects.deleteConstraint(id, user);

    if (success) {
      filteredConstraints = filteredConstraints.filter(constraint => constraint.id !== id);

      if (id === selectedConstraint?.id) {
        selectedConstraint = null;
      }
    }
  }

  function deleteConstraintContext(event: CustomEvent<RowId[]>) {
    deleteConstraint({ id: event.detail[0] as number });
  }

  function editConstraint({ id }: Pick<Constraint, 'id'>) {
    goto(`${base}/constraints/edit/${id}`);
  }

  function editConstraintContext(event: CustomEvent<RowId[]>) {
    editConstraint({ id: event.detail[0] as number });
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

  function toggleConstraint(event: CustomEvent<DataGridRowSelection<Constraint>>) {
    const {
      detail: { data: clickedConstraint, isSelected },
    } = event;

    if (isSelected) {
      selectedConstraint = clickedConstraint;
    } else if (selectedConstraint?.id === clickedConstraint.id) {
      selectedConstraint = null;
    }
  }
</script>

<CssGrid bind:columns={$constraintsColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Constraints</SectionTitle>

      <Input>
        <input
          bind:value={filterText}
          class="st-input"
          placeholder="Filter constraints"
          style="max-width: 300px; width: 100%;"
        />
      </Input>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/constraints/new`)}> New </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if filteredConstraints.length}
        <SingleActionDataGrid
          {columnDefs}
          hasEdit={true}
          itemDisplayText="Constraint"
          items={filteredConstraints}
          {user}
          on:deleteItem={deleteConstraintContext}
          on:editItem={editConstraintContext}
          on:rowSelected={toggleConstraint}
        />
      {:else}
        <div class="p1 st-typography-label">No Constraints Found</div>
      {/if}
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <ConstraintEditor
    constraintDefinition={selectedConstraint?.definition ?? 'No Constraint Selected'}
    {constraintModelId}
    readOnly={true}
    title="Constraint - Definition Editor (Read-only)"
    {user}
  />
</CssGrid>
