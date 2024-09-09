<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { CellEditingStoppedEvent, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SearchParameters } from '../../enums/searchParameters';
  import { plan, planReadOnly } from '../../stores/plan';
  import { allowedSchedulingGoalSpecs, schedulingGoals, schedulingPlanSpecification } from '../../stores/scheduling';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type {
    SchedulingGoalMetadata,
    SchedulingGoalPlanSpecInsertInput,
    SchedulingGoalPlanSpecification,
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
    viewGoal: (goal: SchedulingGoalMetadata) => void;
  };
  type SchedulingGoalCellRendererParams = ICellRendererParams<SchedulingGoalMetadata> & CellRendererParams;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();
  const baseColumnDefs: DataGridColumnDef<SchedulingGoalMetadata>[] = [
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
      valueGetter: (params: ValueGetterParams<SchedulingGoalMetadata>) => {
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

  let dataGrid: DataGrid<SchedulingGoalMetadata> | undefined = undefined;
  let filterText: string = '';
  let filteredGoals: SchedulingGoalMetadata[] = [];
  let hasCreatePermission: boolean = false;
  let hasEditSpecPermission: boolean = false;
  let selectedGoals: Record<string, boolean> = {};

  $: filteredGoals = $schedulingGoals
    // TODO: remove this after db merge as it becomes redundant
    .filter(({ owner, public: isPublic }) => {
      if (!isPublic && !isAdminRole(user?.activeRole)) {
        return owner === user?.id;
      }
      return true;
    })
    .filter(goal => {
      const filterTextLowerCase = filterText.toLowerCase();
      const includesId = `${goal.id}`.includes(filterTextLowerCase);
      const includesName = goal.name.toLocaleLowerCase().includes(filterTextLowerCase);
      return includesId || includesName;
    });
  $: selectedGoals = $allowedSchedulingGoalSpecs.reduce(
    (prevBooleanMap: Record<string, boolean>, schedulingGoalPlanSpec: SchedulingGoalPlanSpecification) => {
      return {
        ...prevBooleanMap,
        [schedulingGoalPlanSpec.goal_id]: true,
      };
    },
    {},
  );
  $: hasCreatePermission = featurePermissions.schedulingGoals.canCreate(user);
  $: hasEditSpecPermission = $plan ? featurePermissions.schedulingGoalsPlanSpec.canUpdate(user, $plan) : false;
  $: {
    columnDefs = [
      ...baseColumnDefs,
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: SchedulingGoalCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              rowData: params.data,
              viewCallback: params.viewGoal,
              viewTooltip: {
                content: 'View Goal',
                placement: 'bottom',
              },
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          viewGoal,
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
        valueGetter: (params: ValueGetterParams<SchedulingGoalMetadata>) => {
          const { data } = params;
          if (data) {
            return !!selectedGoals[data.id];
          }
          return false;
        },
        width: 35,
      },
    ];
  }
  $: if (selectedGoals) {
    dataGrid?.redrawRows();
  }

  function viewGoal({ id }: Pick<SchedulingGoalMetadata, 'id'>) {
    const goal = $schedulingGoals.find(c => c.id === id);
    window.open(
      `${base}/scheduling/goals/edit/${goal?.id}?${SearchParameters.REVISION}=${goal?.versions[0].revision}&${SearchParameters.MODEL_ID}=${$plan?.model.id}`,
    );
  }

  function onToggleGoal(event: CustomEvent<CellEditingStoppedEvent<SchedulingGoalMetadata, boolean>>) {
    const {
      detail: { data, newValue },
    } = event;

    if (data) {
      selectedGoals = {
        ...selectedGoals,
        [data.id]: newValue,
      };
    }
  }

  async function onUpdateGoal(selectedGoals: Record<number, boolean>) {
    if ($plan && $schedulingPlanSpecification) {
      const goalPlanSpecUpdates: {
        goalPlanSpecIdsToDelete: number[];
        goalPlanSpecsToAdd: SchedulingGoalPlanSpecInsertInput[];
      } = Object.keys(selectedGoals).reduce(
        (
          prevGoalPlanSpecUpdates: {
            goalPlanSpecIdsToDelete: number[];
            goalPlanSpecsToAdd: SchedulingGoalPlanSpecInsertInput[];
          },
          selectedGoalId: string,
        ) => {
          const goalId = parseInt(selectedGoalId);
          const isSelected = selectedGoals[goalId];

          // if we find at least one goal invocation with the selected goal_id, we don't want to insert this goal_id into the plan spec
          // i.e. this goal was already selected when we entered the modal, so we don't want to kick off an update, which would cause a duplicate invocation to appear
          const goalAlreadyExistsInPlanSpec = $allowedSchedulingGoalSpecs.find(e => e.goal_id === goalId) !== undefined;

          if (isSelected && $schedulingPlanSpecification !== null) {
            if (!goalAlreadyExistsInPlanSpec) {
              return {
                ...prevGoalPlanSpecUpdates,
                goalPlanSpecsToAdd: [
                  ...prevGoalPlanSpecUpdates.goalPlanSpecsToAdd,
                  {
                    enabled: true,
                    goal_id: goalId,
                    goal_revision: null,
                    specification_id: $schedulingPlanSpecification.id,
                  } as SchedulingGoalPlanSpecInsertInput,
                ],
              };
            }
            return prevGoalPlanSpecUpdates;
          } else {
            return {
              ...prevGoalPlanSpecUpdates,
              goalPlanSpecIdsToDelete: [...prevGoalPlanSpecUpdates.goalPlanSpecIdsToDelete, goalId],
            };
          }
        },
        {
          goalPlanSpecIdsToDelete: [],
          goalPlanSpecsToAdd: [],
        },
      );
      await effects.updateSchedulingGoalPlanSpecifications(
        $plan,
        goalPlanSpecUpdates.goalPlanSpecsToAdd,
        goalPlanSpecUpdates.goalPlanSpecIdsToDelete,
        user,
      );
      dispatch('close');
    }
  }
</script>

<Modal height={500} width={750}>
  <ModalHeader on:close>Manage Scheduling Goals</ModalHeader>
  <ModalContent style="padding:0">
    <div class="goals-modal-container">
      <div class="goals-modal-filter-container">
        <div class="goals-modal-title">Scheduling Goals</div>
        <Input>
          <input bind:value={filterText} class="st-input" placeholder="Filter goals" style="width: 100%;" />
        </Input>
        <button
          class="st-button secondary ellipsis"
          name="new-scheduling-goal"
          use:permissionHandler={{
            hasPermission: hasCreatePermission,
            permissionError,
          }}
          on:click={() => window.open(`${base}/scheduling/goals/new?${SearchParameters.MODEL_ID}=${$plan?.model_id}`)}
        >
          New
        </button>
      </div>
      <hr />
      <div class="goals-modal-table-container">
        {#if filteredGoals.length}
          <DataGrid bind:this={dataGrid} {columnDefs} rowData={filteredGoals} on:cellEditingStopped={onToggleGoal} />
        {:else}
          <div class="p1 st-typography-label">No Scheduling Goals Found</div>
        {/if}
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button
      class="st-button"
      on:click={() => onUpdateGoal(selectedGoals)}
      use:permissionHandler={{
        hasPermission: hasEditSpecPermission && !$planReadOnly,
        permissionError: $planReadOnly
          ? PlanStatusMessages.READ_ONLY
          : 'You do not have permission to update the scheduling goals on this plan.',
      }}
    >
      Update
    </button>
  </ModalFooter>
</Modal>

<style>
  .goals-modal-container {
    display: grid;
    grid-template-rows: min-content min-content auto;
    height: 100%;
    row-gap: 0.5rem;
  }

  .goals-modal-container hr {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 0 1rem;
    width: auto;
  }

  .goals-modal-filter-container {
    align-items: center;
    column-gap: 0.25rem;
    display: grid;
    grid-template-columns: min-content auto min-content;
    margin: 0.5rem 1rem 0;
  }

  .goals-modal-title {
    font-weight: bold;
  }

  .goals-modal-table-container {
    height: 100%;
    padding: 0 1rem 0.5rem;
    width: 100%;
  }
</style>
