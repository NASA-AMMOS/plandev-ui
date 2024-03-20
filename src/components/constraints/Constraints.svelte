<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { SearchParameters } from '../../enums/searchParameters';
  import { constraints, constraintsColumns } from '../../stores/constraints';
  import type { User } from '../../types/app';
  import type { ConstraintMetadata } from '../../types/constraint';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import Input from '../form/Input.svelte';
  import DefinitionEditor from '../ui/Association/DefinitionEditor.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../ui/DataGrid/DataGridTags';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let user: User | null;

  type CellRendererParams = {
    deleteConstraint: (constraint: ConstraintMetadata) => void;
    editConstraint: (constraint: ConstraintMetadata) => void;
  };
  type ConstraintsCellRendererParams = ICellRendererParams<ConstraintMetadata> & CellRendererParams;

  const baseColumnDefs: DataGridColumnDef<ConstraintMetadata>[] = [
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
    { field: 'name', filter: 'text', headerName: 'Name', minWidth: 80, resizable: true, sortable: true },
    {
      field: 'owner',
      filter: 'string',
      headerName: 'Owner',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 80,
    },
    {
      field: 'updated_by',
      filter: 'string',
      headerName: 'Updated By',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 120,
    },
    {
      field: 'versions',
      filter: 'string',
      headerName: 'Latest Version',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueGetter: (params: ValueGetterParams<ConstraintMetadata>) => {
        return params?.data?.versions[params?.data?.versions.length - 1].revision;
      },
      width: 125,
    },
    {
      autoHeight: true,
      cellRenderer: tagsCellRenderer,
      field: 'tags',
      filter: 'text',
      filterValueGetter: tagsFilterValueGetter,
      headerName: 'Tags',
      resizable: true,
      sortable: false,
      width: 220,
      wrapText: true,
    },
  ];
  const permissionError = 'You do not have permission to create a constraint.';

  let columnDefs = baseColumnDefs;

  let filterText: string = '';
  let filteredConstraints: ConstraintMetadata[] = [];
  let hasPermission: boolean = false;
  let selectedConstraint: ConstraintMetadata | null = null;

  $: filteredConstraints = $constraints.filter(constraint => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${constraint.id}`.includes(filterTextLowerCase);
    const includesName = constraint.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });
  $: hasPermission = featurePermissions.constraints.canCreate(user);
  $: if (selectedConstraint !== null) {
    const found = $constraints.findIndex(constraint => constraint.id === selectedConstraint?.id);
    if (found === -1) {
      selectedConstraint = null;
    }
  }
  $: columnDefs = [
    ...baseColumnDefs,
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
            hasDeletePermission: params.data ? hasDeletePermission(user, params.data) : false,
            hasDeletePermissionError:
              params.data && !hasDeletePermission(user, params.data) && isConstraintInUse(params.data)
                ? 'Cannot delete constraint that is being used'
                : '',
            hasEditPermission: params.data ? hasEditPermission(user, params.data) : false,
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
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 55,
    },
  ];

  async function deleteConstraint(constraint: ConstraintMetadata) {
    const success = await effects.deleteConstraint(constraint, user);

    if (success) {
      filteredConstraints = filteredConstraints.filter(c => constraint.id !== c.id);

      if (constraint.id === selectedConstraint?.id) {
        selectedConstraint = null;
      }
    }
  }

  function deleteConstraintContext(event: CustomEvent<RowId[]>) {
    const id = event.detail[0] as number;
    const constraint = $constraints.find(c => c.id === id);
    if (constraint) {
      deleteConstraint(constraint);
    }
  }

  function editConstraint({ id }: Pick<ConstraintMetadata, 'id'>) {
    const constraint = $constraints.find(c => c.id === id);
    goto(
      `${base}/constraints/edit/${id}?${SearchParameters.REVISION}=${
        constraint?.versions[constraint?.versions.length - 1].revision
      }`,
    );
  }

  function editConstraintContext(event: CustomEvent<RowId[]>) {
    editConstraint({ id: event.detail[0] as number });
  }

  function isConstraintInUse(constraint: ConstraintMetadata) {
    return constraint.models_using.length > 0 || constraint.plans_using.length > 0;
  }

  function hasDeletePermission(user: User | null, constraint: ConstraintMetadata) {
    return featurePermissions.constraints.canDelete(user, constraint) && !isConstraintInUse(constraint);
  }

  function hasEditPermission(user: User | null, constraint: ConstraintMetadata) {
    return featurePermissions.constraints.canUpdate(user, constraint);
  }

  function toggleConstraint(event: CustomEvent<DataGridRowSelection<ConstraintMetadata>>) {
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
        <input bind:value={filterText} class="st-input" placeholder="Filter constraints" style="width: 100%;" />
      </Input>

      <div class="right">
        <button
          class="st-button secondary ellipsis"
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
          on:click={() => goto(`${base}/constraints/new`)}
        >
          New
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if filteredConstraints.length}
        <SingleActionDataGrid
          {columnDefs}
          hasEdit={true}
          {hasDeletePermission}
          {hasEditPermission}
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

  <DefinitionEditor
    definition={selectedConstraint
      ? selectedConstraint.versions[selectedConstraint.versions.length - 1].definition
      : 'No Constraint Selected'}
    readOnly={true}
    title="Constraint - Definition Editor (Read-only)"
  />
</CssGrid>
