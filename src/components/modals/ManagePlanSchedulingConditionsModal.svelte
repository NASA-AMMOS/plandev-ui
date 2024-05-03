<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { CellEditingStoppedEvent, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SearchParameters } from '../../enums/searchParameters';
  import { plan, planReadOnly } from '../../stores/plan';
  import {
    allowedSchedulingConditionSpecs,
    schedulingConditions,
    schedulingPlanSpecification,
  } from '../../stores/scheduling';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type {
    SchedulingConditionMetadata,
    SchedulingConditionPlanSpecInsertInput,
    SchedulingConditionPlanSpecification,
  } from '../../types/scheduling';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions, isAdminRole } from '../../utilities/permissions';
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
    viewCondition: (condition: SchedulingConditionMetadata) => void;
  };
  type SchedulingConditionCellRendererParams = ICellRendererParams<SchedulingConditionMetadata> & CellRendererParams;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();
  const baseColumnDefs: DataGridColumnDef<SchedulingConditionMetadata>[] = [
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
      valueGetter: (params: ValueGetterParams<SchedulingConditionMetadata>) => {
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
      wrapText: true,
    },
  ];
  const permissionError = 'You do not have permission to add this constraint.';

  let columnDefs = baseColumnDefs;

  let dataGrid: DataGrid<SchedulingConditionMetadata> | undefined = undefined;
  let filterText: string = '';
  let filteredConditions: SchedulingConditionMetadata[] = [];
  let hasCreatePermission: boolean = false;
  let hasEditSpecPermission: boolean = false;
  let selectedConditions: Record<string, boolean> = {};

  $: filteredConditions = $schedulingConditions
    // TODO: remove this after db merge as it becomes redundant
    .filter(({ owner, public: isPublic }) => {
      if (!isPublic && !isAdminRole(user?.activeRole)) {
        return owner === user?.id;
      }
      return true;
    })
    .filter(condition => {
      const filterTextLowerCase = filterText.toLowerCase();
      const includesId = `${condition.id}`.includes(filterTextLowerCase);
      const includesName = condition.name.toLocaleLowerCase().includes(filterTextLowerCase);
      return includesId || includesName;
    });
  $: selectedConditions = $allowedSchedulingConditionSpecs.reduce(
    (prevBooleanMap: Record<string, boolean>, schedulingConditionPlanSpec: SchedulingConditionPlanSpecification) => {
      return {
        ...prevBooleanMap,
        [schedulingConditionPlanSpec.condition_id]: true,
      };
    },
    {},
  );
  $: hasCreatePermission = featurePermissions.schedulingConditions.canCreate(user);
  $: hasEditSpecPermission = $plan ? featurePermissions.schedulingConditionsPlanSpec.canUpdate(user, $plan) : false;
  $: {
    columnDefs = [
      ...baseColumnDefs,
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: SchedulingConditionCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              rowData: params.data,
              viewCallback: params.viewCondition,
              viewTooltip: {
                content: 'View Condition',
                placement: 'bottom',
              },
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          viewCondition,
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
        valueGetter: (params: ValueGetterParams<SchedulingConditionMetadata>) => {
          const { data } = params;
          if (data) {
            return !!selectedConditions[data.id];
          }
          return false;
        },
        width: 35,
      },
    ];
  }
  $: if (selectedConditions) {
    dataGrid?.redrawRows();
  }

  function viewCondition({ id }: Pick<SchedulingConditionMetadata, 'id'>) {
    const condition = $schedulingConditions.find(c => c.id === id);
    window.open(
      `${base}/scheduling/conditions/edit/${condition?.id}?${SearchParameters.REVISION}=${condition?.versions[0].revision}&${SearchParameters.MODEL_ID}=${$plan?.model.id}`,
    );
  }

  function onToggleCondition(event: CustomEvent<CellEditingStoppedEvent<SchedulingConditionMetadata, boolean>>) {
    const {
      detail: { data, newValue },
    } = event;

    if (data) {
      selectedConditions = {
        ...selectedConditions,
        [data.id]: newValue,
      };
    }
  }

  async function onUpdateCondition(selectedConditions: Record<number, boolean>) {
    if ($plan && $schedulingPlanSpecification) {
      const conditionPlanSpecUpdates: {
        conditionPlanSpecIdsToDelete: number[];
        conditionPlanSpecsToAdd: SchedulingConditionPlanSpecInsertInput[];
      } = Object.keys(selectedConditions).reduce(
        (
          prevConditionPlanSpecUpdates: {
            conditionPlanSpecIdsToDelete: number[];
            conditionPlanSpecsToAdd: SchedulingConditionPlanSpecInsertInput[];
          },
          selectedConditionId: string,
        ) => {
          const conditionId = parseInt(selectedConditionId);
          const isSelected = selectedConditions[conditionId];
          const conditionPlanSpec = $allowedSchedulingConditionSpecs[conditionId];

          if (isSelected && $schedulingPlanSpecification !== null) {
            if (!conditionPlanSpec || conditionPlanSpec.condition_metadata?.owner === user?.id) {
              return {
                ...prevConditionPlanSpecUpdates,
                conditionPlanSpecsToAdd: [
                  ...prevConditionPlanSpecUpdates.conditionPlanSpecsToAdd,
                  {
                    condition_id: conditionId,
                    condition_revision: null,
                    enabled: true,
                    specification_id: $schedulingPlanSpecification.id,
                  } as SchedulingConditionPlanSpecInsertInput,
                ],
              };
            }
            return prevConditionPlanSpecUpdates;
          } else {
            return {
              ...prevConditionPlanSpecUpdates,
              conditionPlanSpecIdsToDelete: [...prevConditionPlanSpecUpdates.conditionPlanSpecIdsToDelete, conditionId],
            };
          }
        },
        {
          conditionPlanSpecIdsToDelete: [],
          conditionPlanSpecsToAdd: [],
        },
      );
      await effects.updateSchedulingConditionPlanSpecifications(
        $plan,
        $schedulingPlanSpecification.id,
        conditionPlanSpecUpdates.conditionPlanSpecsToAdd,
        conditionPlanSpecUpdates.conditionPlanSpecIdsToDelete,
        user,
      );
      dispatch('close');
    }
  }
</script>

<Modal height={500} width={750}>
  <ModalHeader on:close>Manage Scheduling Conditions</ModalHeader>
  <ModalContent style="padding:0">
    <div class="conditions-modal-container">
      <div class="conditions-modal-filter-container">
        <div class="conditions-modal-title">Scheduling Conditions</div>
        <Input>
          <input bind:value={filterText} class="st-input" placeholder="Filter conditions" style="width: 100%;" />
        </Input>
        <button
          class="st-button secondary ellipsis"
          name="new-scheduling-condition"
          use:permissionHandler={{
            hasPermission: hasCreatePermission,
            permissionError,
          }}
          on:click={() =>
            window.open(`${base}/scheduling/conditions/new?${SearchParameters.MODEL_ID}=${$plan?.model_id}`)}
        >
          New
        </button>
      </div>
      <hr />
      <div class="conditions-modal-table-container">
        {#if filteredConditions.length}
          <DataGrid
            bind:this={dataGrid}
            {columnDefs}
            rowData={filteredConditions}
            on:cellEditingStopped={onToggleCondition}
          />
        {:else}
          <div class="p1 st-typography-label">No Scheduling Conditions Found</div>
        {/if}
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button
      class="st-button"
      on:click={() => onUpdateCondition(selectedConditions)}
      use:permissionHandler={{
        hasPermission: hasEditSpecPermission && !$planReadOnly,
        permissionError: $planReadOnly
          ? PlanStatusMessages.READ_ONLY
          : 'You do not have permission to update the scheduling conditions on this plan.',
      }}
    >
      Update
    </button>
  </ModalFooter>
</Modal>

<style>
  .conditions-modal-container {
    display: grid;
    grid-template-rows: min-content min-content auto;
    height: 100%;
    row-gap: 0.5rem;
  }

  .conditions-modal-container hr {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 0 1rem;
    width: auto;
  }

  .conditions-modal-filter-container {
    align-items: center;
    column-gap: 0.25rem;
    display: grid;
    grid-template-columns: min-content auto min-content;
    margin: 0.5rem 1rem 0;
  }

  .conditions-modal-title {
    font-weight: bold;
  }

  .conditions-modal-table-container {
    height: 100%;
    padding: 0 1rem 0.5rem;
    width: 100%;
  }
</style>
