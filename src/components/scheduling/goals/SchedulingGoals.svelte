<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { tagsMap } from '../../../stores/tags';
  import type { User } from '../../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../../types/data-grid';
  import type { PlanSchedulingSpec } from '../../../types/plan';
  import type { SchedulingGoal, SchedulingGoalSlim } from '../../../types/scheduling';
  import type { Tag } from '../../../types/tags';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions } from '../../../utilities/permissions';
  import Input from '../../form/Input.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import { tagsCellRenderer } from '../../ui/DataGrid/DataGridTagsCellRenderer';
  import SingleActionDataGrid from '../../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';

  export let schedulingGoals: SchedulingGoalSlim[] = [];
  export let selectedGoal: SchedulingGoal | null | undefined = null;
  export let user: User | null;
  export let plans: PlanSchedulingSpec[] | null;

  type CellRendererParams = {
    deleteGoal: (goal: SchedulingGoal) => void;
    editGoal: (goal: SchedulingGoal) => void;
  };
  type SchedulingGoalsCellRendererParams = ICellRendererParams<SchedulingGoal> & CellRendererParams;

  let columnDefs: DataGridColumnDef[] = [];
  $: if (user && plans) {
    columnDefs = [
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
      { field: 'model_id', filter: 'number', headerName: 'Model ID', sortable: true, width: 90 },
      { field: 'author', filter: 'string', headerName: 'Author', sortable: true, width: 100 },
      { field: 'last_modified_by', filter: 'string', headerName: 'Last Modified By', sortable: true, width: 100 },
      { field: 'description', filter: 'string', headerName: 'Description', sortable: true, width: 120 },
      {
        autoHeight: true,
        cellRenderer: tagsCellRenderer,
        field: 'tags',
        filter: 'text',
        headerName: 'Tags',
        resizable: true,
        sortable: false,
        width: 220,
        wrapText: true,
      },
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: SchedulingGoalsCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              deleteCallback: params.deleteGoal,
              deleteTooltip: {
                content: 'Delete Goal',
                placement: 'bottom',
              },
              editCallback: params.editGoal,
              editTooltip: {
                content: 'Edit Goal',
                placement: 'bottom',
              },
              hasDeletePermission: params.data ? hasDeletePermission(params.data) : false,
              hasEditPermission: params.data ? hasEditPermission(params.data) : false,
              rowData: params.data,
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          deleteGoal,
          editGoal,
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
  }

  const dispatch = createEventDispatcher();

  let filteredGoals: SchedulingGoal[] = [];
  let filterText: string = '';

  $: if (schedulingGoals && $tagsMap) {
    filteredGoals = schedulingGoals
      .filter(goal => {
        const filterTextLowerCase = filterText.toLowerCase();
        const includesId = `${goal.id}`.includes(filterTextLowerCase);
        const includesName = goal.name.toLocaleLowerCase().includes(filterTextLowerCase);
        return includesId || includesName;
      })
      .map(goal => {
        const matchingTags: { tag: Tag }[] = [];
        goal.tags.forEach(({ tag_id }) => {
          const matchingTag = $tagsMap[tag_id];
          if (matchingTag) {
            matchingTags.push({ tag: matchingTag });
          }
        });
        const goalWithTags: SchedulingGoal = { ...goal, tags: matchingTags };
        return goalWithTags;
      });
  }
  $: if (selectedGoal !== null) {
    const found = schedulingGoals.findIndex(goal => goal.id === selectedGoal?.id);
    if (found === -1) {
      selectedGoal = null;
    }
  }

  function deleteGoal({ id }: Pick<SchedulingGoal, 'id'>) {
    dispatch('deleteGoal', id);
  }

  function deleteGoalContext(event: CustomEvent<RowId[]>) {
    deleteGoal({ id: event.detail[0] as number });
  }

  function editGoal({ id }: Pick<SchedulingGoal, 'id'>) {
    goto(`${base}/scheduling/goals/edit/${id}`);
  }

  function editGoalContext(event: CustomEvent<RowId[]>) {
    editGoal({ id: event.detail[0] as number });
  }

  function hasDeletePermission(goal: SchedulingGoal) {
    const {
      scheduling_specification_goal: { specification_id },
    } = goal;
    const plan = plans?.find(plan => plan.scheduling_specifications[0]?.id === specification_id);
    if (plan) {
      return featurePermissions.schedulingGoals.canDelete(user, plan);
    }
    return false;
  }

  function hasEditPermission(goal: SchedulingGoal) {
    const {
      scheduling_specification_goal: { specification_id },
    } = goal;
    const plan = plans?.find(plan => plan.scheduling_specifications[0]?.id === specification_id);
    if (plan) {
      return featurePermissions.schedulingGoals.canUpdate(user, plan);
    }
    return false;
  }

  function hasCreatePermission(user: User): boolean {
    return plans?.some(plan => featurePermissions.schedulingGoals.canCreate(user, plan)) ?? false;
  }

  function rowSelected(event: CustomEvent<DataGridRowSelection<SchedulingGoal>>) {
    dispatch('rowSelected', event.detail);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <SectionTitle>Scheduling Goals</SectionTitle>

    <Input>
      <input bind:value={filterText} class="st-input" placeholder="Filter goals" style="width: 100%;" />
    </Input>

    <div class="right">
      <button
        class="st-button secondary ellipsis"
        use:permissionHandler={{
          hasPermission: user ? hasCreatePermission(user) : false,
          permissionError: 'You do not have permission to create Scheduling Goals',
        }}
        on:click={() => goto(`${base}/scheduling/goals/new`)}
      >
        New
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if filteredGoals.length}
      <SingleActionDataGrid
        {columnDefs}
        hasEdit={true}
        itemDisplayText="Goal"
        items={filteredGoals}
        selectedItemId={selectedGoal?.id ?? null}
        {user}
        on:deleteItem={deleteGoalContext}
        on:editItem={editGoalContext}
        on:rowSelected={rowSelected}
      />
    {:else}
      No Scheduling Goals Found
    {/if}
  </svelte:fragment>
</Panel>
