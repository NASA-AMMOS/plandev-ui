<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { CellEditingStoppedEvent, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../../enums/planStatusMessages';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { plan, planReadOnly } from '../../../stores/plan';
  import {
    allowedSchedulingGoalSpecs,
    schedulingGoals,
    schedulingGoalsLoading,
    schedulingPlanSpecification,
  } from '../../../stores/scheduling';
  import type { User } from '../../../types/app';
  import type { DataGridColumnDef } from '../../../types/data-grid';
  import type {
    SchedulingGoalMetadata,
    SchedulingGoalPlanSpecInsertInput,
    SchedulingGoalPlanSpecification,
  } from '../../../types/scheduling';
  import effects from '../../../utilities/effects';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions, isAdminRole } from '../../../utilities/permissions';
  import Input from '../../form/Input.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../../ui/DataGrid/DataGridTags';
  import StellarDialog from './StellarDialog.svelte';

  export let open: boolean = true;
  export let user: User | null;

  type CellRendererParams = {
    viewGoal: (goal: SchedulingGoalMetadata) => void;
  };
  type SchedulingGoalCellRendererParams = ICellRendererParams<SchedulingGoalMetadata> & CellRendererParams;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean };
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
  $: selectedGoals = ($allowedSchedulingGoalSpecs || []).reduce(
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
      `${base}/scheduling/goals/edit/${goal?.id}?${SearchParameters.REVISION}=${goal?.versions[0].revision}&${SearchParameters.MODEL_ID}=${$plan?.model?.id}`,
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

  function handleCancel() {
    open = false;
  }

  async function handleUpdate() {
    if ($plan && $schedulingPlanSpecification && $allowedSchedulingGoalSpecs) {
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

          const goalsInPlanSpecification = ($allowedSchedulingGoalSpecs || []).filter(
            schedulingGoalPlanSpecification => schedulingGoalPlanSpecification.goal_id === goalId,
          );

          if (isSelected && $schedulingPlanSpecification !== null) {
            if (!goalsInPlanSpecification.length) {
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
              goalPlanSpecIdsToDelete: [
                ...prevGoalPlanSpecUpdates.goalPlanSpecIdsToDelete,
                ...goalsInPlanSpecification.map(({ goal_invocation_id }) => goal_invocation_id),
              ],
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
      open = false;
      dispatch('resolve', { confirm: true });
    }
  }
</script>

<StellarDialog
  bind:open
  className="w-[750px] h-[500px]"
  title="Manage Scheduling Goals"
  closeOnEscape={false}
  closeOnOutsideClick={false}
  on:close
>
  <div class="flex h-full flex-col">
    <div class="mb-2 grid grid-cols-[min-content_auto_min-content] items-center gap-1 px-4">
      <div class="whitespace-nowrap font-bold">Scheduling Goals</div>
      <Input>
        <input bind:value={filterText} class="st-input w-full" placeholder="Filter goals" />
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
    <hr class="mx-4 border-t border-gray-300" />
    <div class="flex-1 overflow-hidden px-4 pb-2 pt-2">
      {#if $schedulingGoalsLoading || filteredGoals.length}
        <DataGrid
          bind:this={dataGrid}
          {columnDefs}
          rowData={filteredGoals}
          on:cellEditingStopped={onToggleGoal}
          loading={$schedulingGoalsLoading}
        />
      {:else}
        <div class="p-1 text-sm font-medium">No Scheduling Goals Found</div>
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
            : 'You do not have permission to update the scheduling goals on this plan.',
        }}
      >
        Update
      </button>
    </div>
  </svelte:fragment>
</StellarDialog>
