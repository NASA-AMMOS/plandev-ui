<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { CellEditingStoppedEvent, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SearchParameters } from '../../enums/searchParameters';
  import { allowedConstraintPlanSpecMap, allowedConstraintSpecs, constraints } from '../../stores/constraints';
  import { plan, planId, planReadOnly } from '../../stores/plan';
  import type { User } from '../../types/app';
  import type { ConstraintMetadata, ConstraintPlanSpec, ConstraintPlanSpecInsertInput } from '../../types/constraint';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import Input from '../form/Input.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../ui/DataGrid/DataGridTags';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let user: User | null;

  type CellRendererParams = {
    viewConstraint: (constraint: ConstraintMetadata) => void;
  };
  type ConstraintsCellRendererParams = ICellRendererParams<ConstraintMetadata> & CellRendererParams;

  const dispatch = createEventDispatcher();
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
      headerName: 'Latest',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueGetter: (params: ValueGetterParams<ConstraintMetadata>) => {
        return params?.data?.versions[params?.data?.versions.length - 1].revision;
      },
      width: 80,
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
  const permissionError = 'You do not have permission to add this constraint.';

  let columnDefs = baseColumnDefs;

  let dataGrid: DataGrid<ConstraintMetadata> | undefined = undefined;
  let filterText: string = '';
  let filteredConstraints: ConstraintMetadata[] = [];
  let hasCreatePermission: boolean = false;
  let hasEditSpecPermission: boolean = false;
  let selectedConstraints: Record<string, boolean> = {};

  $: filteredConstraints = $constraints.filter(constraint => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${constraint.id}`.includes(filterTextLowerCase);
    const includesName = constraint.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });
  $: selectedConstraints = $allowedConstraintSpecs.reduce(
    (prevBooleanMap: Record<string, boolean>, constraintPlanSpec: ConstraintPlanSpec) => {
      return {
        ...prevBooleanMap,
        [constraintPlanSpec.constraint_id]: true,
      };
    },
    {},
  );
  $: hasCreatePermission = featurePermissions.constraints.canCreate(user);
  $: hasEditSpecPermission = $plan ? featurePermissions.constraintPlanSpec.canUpdate(user, $plan) : false;
  $: {
    columnDefs = [
      ...baseColumnDefs,
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: ConstraintsCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              rowData: params.data,
              viewCallback: params.viewConstraint,
              viewTooltip: {
                content: 'View Constraint',
                placement: 'bottom',
              },
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          viewConstraint,
        } as CellRendererParams,
        headerName: '',
        resizable: false,
        sortable: false,
        suppressAutoSize: true,
        suppressSizeToFit: true,
        width: 20,
      },
      {
        cellDataType: 'boolean',
        editable: hasEditSpecPermission,
        headerName: '',
        suppressAutoSize: true,
        suppressSizeToFit: true,
        valueGetter: (params: ValueGetterParams<ConstraintMetadata>) => {
          const { data } = params;
          if (data) {
            return !!selectedConstraints[data.id];
          }
          return false;
        },
        width: 35,
      },
    ];
  }
  $: if (selectedConstraints) {
    dataGrid?.redrawRows();
  }

  function viewConstraint({ id }: Pick<ConstraintMetadata, 'id'>) {
    const constraint = $constraints.find(c => c.id === id);
    window.open(
      `${base}/constraints/edit/${constraint?.id}?${SearchParameters.REVISION}=${
        constraint?.versions[constraint?.versions.length - 1].revision
      }&${SearchParameters.MODEL_ID}=${$plan?.model.id}`,
    );
  }

  function onToggleConstraint(event: CustomEvent<CellEditingStoppedEvent<ConstraintMetadata, boolean>>) {
    const {
      detail: { data, newValue },
    } = event;

    if (data) {
      selectedConstraints = {
        ...selectedConstraints,
        [data.id]: newValue,
      };
    }
  }

  async function onUpdateConstraints(selectedConstraints: Record<number, boolean>) {
    if ($plan) {
      const constraintPlanSpecUpdates: {
        constraintPlanSpecIdsToDelete: number[];
        constraintPlanSpecsToAdd: ConstraintPlanSpecInsertInput[];
      } = Object.keys(selectedConstraints).reduce(
        (
          prevConstraintPlanSpecUpdates: {
            constraintPlanSpecIdsToDelete: number[];
            constraintPlanSpecsToAdd: ConstraintPlanSpecInsertInput[];
          },
          selectedConstraintId: string,
        ) => {
          const constraintId = parseInt(selectedConstraintId);
          const isSelected = selectedConstraints[constraintId];
          const constraintPlanSpec = $allowedConstraintPlanSpecMap[constraintId];

          if (isSelected) {
            if (!constraintPlanSpec || constraintPlanSpec.constraint_metadata?.owner === user?.id) {
              return {
                ...prevConstraintPlanSpecUpdates,
                constraintPlanSpecsToAdd: [
                  ...prevConstraintPlanSpecUpdates.constraintPlanSpecsToAdd,
                  {
                    constraint_id: constraintId,
                    constraint_revision: null,
                    enabled: true,
                    plan_id: $planId,
                  } as ConstraintPlanSpecInsertInput,
                ],
              };
            }
            return prevConstraintPlanSpecUpdates;
          } else {
            return {
              ...prevConstraintPlanSpecUpdates,
              constraintPlanSpecIdsToDelete: [
                ...prevConstraintPlanSpecUpdates.constraintPlanSpecIdsToDelete,
                constraintId,
              ],
            };
          }
        },
        {
          constraintPlanSpecIdsToDelete: [],
          constraintPlanSpecsToAdd: [],
        },
      );

      await effects.updateConstraintPlanSpecifications(
        $plan,
        constraintPlanSpecUpdates.constraintPlanSpecsToAdd,
        constraintPlanSpecUpdates.constraintPlanSpecIdsToDelete,
        user,
      );
      dispatch('close');
    }
  }
</script>

<Modal height={500} width={750}>
  <ModalHeader on:close>Manage Constraints</ModalHeader>
  <ModalContent style="padding:0">
    <div class="constraints-modal-container">
      <div class="constraints-modal-filter-container">
        <div class="constraints-modal-title">Constraints</div>
        <Input>
          <input bind:value={filterText} class="st-input" placeholder="Filter constraints" style="width: 100%;" />
        </Input>
        <button
          class="st-button secondary ellipsis"
          name="new-constraint"
          use:permissionHandler={{
            hasPermission: hasCreatePermission,
            permissionError,
          }}
          on:click={() => window.open(`${base}/constraints/new?${SearchParameters.MODEL_ID}=${$plan?.model_id}`)}
        >
          New
        </button>
      </div>
      <hr />
      <div class="constraints-modal-table-container">
        {#if filteredConstraints.length}
          <DataGrid
            bind:this={dataGrid}
            {columnDefs}
            rowData={filteredConstraints}
            on:cellEditingStopped={onToggleConstraint}
          />
        {:else}
          <div class="p1 st-typography-label">No Constraints Found</div>
        {/if}
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button
      class="st-button"
      on:click={() => onUpdateConstraints(selectedConstraints)}
      use:permissionHandler={{
        hasPermission: hasEditSpecPermission && !$planReadOnly,
        permissionError: $planReadOnly
          ? PlanStatusMessages.READ_ONLY
          : 'You do not have permission to update the constraints on this plan.',
      }}
    >
      Update
    </button>
  </ModalFooter>
</Modal>

<style>
  .constraints-modal-container {
    display: grid;
    grid-template-rows: min-content min-content auto;
    height: 100%;
    row-gap: 0.5rem;
  }

  .constraints-modal-container hr {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 0 1rem;
    width: auto;
  }

  .constraints-modal-filter-container {
    align-items: center;
    column-gap: 0.25rem;
    display: grid;
    grid-template-columns: min-content auto min-content;
    margin: 0.5rem 1rem 0;
  }

  .constraints-modal-title {
    font-weight: bold;
  }

  .constraints-modal-table-container {
    height: 100%;
    padding: 0 1rem 0.5rem;
    width: 100%;
  }
</style>
