<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { CellEditingStoppedEvent, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../../enums/planStatusMessages';
  import { SearchParameters } from '../../../enums/searchParameters';
  import {
    allowedConstraintPlanSpecs,
    constraints,
    initialConstraintPlanSpecsLoading,
    initialConstraintsLoading,
  } from '../../../stores/constraints';
  import { plan, planId, planReadOnly } from '../../../stores/plan';
  import type { User } from '../../../types/app';
  import type {
    ConstraintMetadata,
    ConstraintPlanSpecification,
    ConstraintPlanSpecInsertInput,
  } from '../../../types/constraint';
  import type { DataGridColumnDef } from '../../../types/data-grid';
  import effects from '../../../utilities/effects';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions } from '../../../utilities/permissions';
  import Input from '../../form/Input.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../../ui/DataGrid/DataGridTags';
  import StellarDialog from './StellarDialog.svelte';

  export let open: boolean = true;
  export let user: User | null;

  type CellRendererParams = {
    viewConstraint: (constraint: ConstraintMetadata) => void;
  };
  type ConstraintsCellRendererParams = ICellRendererParams<ConstraintMetadata> & CellRendererParams;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean };
  }>();
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
        return params?.data?.versions[0].revision;
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

  $: filteredConstraints = ($constraints || []).filter(constraint => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${constraint.id}`.includes(filterTextLowerCase);
    const includesName = constraint.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });
  $: selectedConstraints = $allowedConstraintPlanSpecs.reduce(
    (prevBooleanMap: Record<string, boolean>, constraintPlanSpec: ConstraintPlanSpecification) => {
      return {
        ...prevBooleanMap,
        [constraintPlanSpec.constraint_id]: true,
      };
    },
    {},
  );
  $: hasCreatePermission = featurePermissions.constraints.canCreate(user);
  $: hasEditSpecPermission = $plan ? featurePermissions.constraintsPlanSpec.canUpdate(user, $plan) : false;
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
        resizable: false,
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
    const constraint = ($constraints || []).find(c => c.id === id);
    window.open(
      `${base}/constraints/edit/${constraint?.id}?${SearchParameters.REVISION}=${constraint?.versions[0].revision}${typeof $plan?.model?.id === 'number' ? `&${SearchParameters.MODEL_ID}=${$plan.model.id}` : ''}`,
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

  function handleCancel() {
    open = false;
  }

  async function handleUpdate() {
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
          const constraintsInPlanSpecification = $allowedConstraintPlanSpecs.filter(
            constraintPlanSpecification => constraintPlanSpecification.constraint_id === constraintId,
          );

          if (isSelected) {
            if (!constraintsInPlanSpecification.length) {
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
                ...constraintsInPlanSpecification.map(({ invocation_id }) => invocation_id),
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
      open = false;
      dispatch('resolve', { confirm: true });
    }
  }
</script>

<StellarDialog
  bind:open
  className="w-[750px] h-[500px]"
  title="Manage Constraints"
  closeOnEscape={false}
  closeOnOutsideClick={false}
  on:close
>
  <div class="flex h-full flex-col">
    <div class="mb-2 grid grid-cols-[min-content_auto_min-content] items-center gap-1 px-4">
      <div class="font-bold">Constraints</div>
      <Input>
        <input
          bind:value={filterText}
          class="st-input w-full"
          aria-label="Filter constraints"
          placeholder="Filter constraints"
        />
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
    <hr class="mx-4 border-t border-gray-300" />
    <div class="flex-1 overflow-hidden px-4 pb-2 pt-2">
      {#if $initialConstraintsLoading || $initialConstraintPlanSpecsLoading || filteredConstraints.length}
        <DataGrid
          loading={$initialConstraintsLoading || $initialConstraintPlanSpecsLoading}
          bind:this={dataGrid}
          {columnDefs}
          rowData={filteredConstraints}
          on:cellEditingStopped={onToggleConstraint}
        />
      {:else}
        <div class="p-1 text-sm font-medium">No Constraints Found</div>
      {/if}
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex w-full justify-end gap-2">
      <button class="st-button secondary" on:click={handleCancel}>Cancel</button>
      <button
        class="st-button"
        on:click={handleUpdate}
        use:permissionHandler={{
          hasPermission: hasEditSpecPermission && !$planReadOnly,
          permissionError: $planReadOnly
            ? PlanStatusMessages.READ_ONLY
            : 'You do not have permission to update the constraints on this plan.',
        }}
      >
        Update
      </button>
    </div>
  </svelte:fragment>
</StellarDialog>
