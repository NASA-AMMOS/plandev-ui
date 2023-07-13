<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams, RedrawRowsParams } from 'ag-grid-community';
  import { expansionSets, expansionSetsColumns } from '../../stores/expansion';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { ExpansionRuleSlim, ExpansionSet } from '../../types/expansion';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';

  export let user: User | null;

  type CellRendererParams = {
    deleteSet: (sequence: ExpansionSet) => void;
  };
  type ExpansionSetCellRendererParams = ICellRendererParams<ExpansionSet> & CellRendererParams;
  type ExpansionRuleCellRendererParams = ICellRendererParams<ExpansionRuleSlim> & {
    editRule: (expansionRule: ExpansionRuleSlim) => void;
  };

  const baseExpansionSetColumnDefs: DataGridColumnDef[] = [
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
      field: 'command_dict_id',
      filter: 'number',
      headerName: 'Command Dictionary ID',
      resizable: true,
      sortable: true,
    },
    { field: 'mission_model_id', filter: 'number', headerName: 'Model ID', resizable: true, sortable: true },
    { field: 'owner', filter: 'text', headerName: 'Owner', resizable: true, sortable: true },
    { field: 'updated_by', filter: 'text', headerName: 'Updated By', resizable: true, sortable: true },
    { field: 'description', filter: 'text', headerName: 'Description', resizable: true, sortable: true },
  ];
  const baseExpansionRuleColumnDefs: DataGridColumnDef[] = [
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
    { field: 'activity_type', filter: 'text', headerName: 'Activity Type', sortable: true },
  ];

  let expansionSetColumnDefs = baseExpansionSetColumnDefs;
  let expansionRuleColumnDefs = baseExpansionRuleColumnDefs;
  let redrawRows: ((params?: RedrawRowsParams<ExpansionRuleSlim> | undefined) => void) | undefined = undefined;
  let selectedExpansionRule: ExpansionRuleSlim | null = null;
  let selectedExpansionRuleIds: number[] = [];
  let selectedExpansionSet: ExpansionSet | null = null;

  $: selectedExpansionRuleIds = selectedExpansionRule ? [selectedExpansionRule.id] : [];
  $: {
    expansionSetColumnDefs = [
      ...baseExpansionSetColumnDefs,
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: ExpansionSetCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              deleteCallback: params.deleteSet,
              deleteTooltip: {
                content: 'Delete Expansion Set',
                placement: 'bottom',
              },
              hasDeletePermission: params.data ? hasDeleteExpansionSetPermission(user, params.data) : false,
              rowData: params.data,
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          deleteSet,
        } as CellRendererParams,
        field: 'actions',
        headerName: '',
        resizable: false,
        sortable: false,
        suppressAutoSize: true,
        suppressSizeToFit: true,
        width: 25,
      },
    ];
    expansionRuleColumnDefs = [
      ...baseExpansionRuleColumnDefs,
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: ExpansionRuleCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              editCallback: params.editRule,
              editTooltip: {
                content: 'Edit Rule',
                placement: 'bottom',
              },
              hasEditPermission: params.data ? hasEditExpansionRulePermission(user, params.data) : false,
              rowData: params.data,
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          editRule,
        },
        field: 'actions',
        headerName: '',
        resizable: false,
        sortable: false,
        suppressAutoSize: true,
        suppressSizeToFit: true,
        width: 55,
      },
    ];
    redrawRows?.();
  }

  async function deleteSet({ id }: Pick<ExpansionSet, 'id'>) {
    const success = await effects.deleteExpansionSet(id, user);

    if (success) {
      expansionSets.filterValueById(id);

      if (id === selectedExpansionSet?.id) {
        selectedExpansionRule = null;
        selectedExpansionSet = null;
      }
    }
  }

  function deleteSetContext(event: CustomEvent<RowId[]>) {
    deleteSet({ id: event.detail[0] as number });
  }

  function editRule({ id }: Pick<ExpansionRuleSlim, 'id'>) {
    goto(`${base}/expansion/rules/edit/${id}`);
  }

  function hasDeleteExpansionSetPermission(user: User | null, expansionSet: ExpansionSet) {
    return featurePermissions.expansionSets.canDelete(user, expansionSet);
  }

  function hasEditExpansionRulePermission(user: User | null, expansionRule: ExpansionRuleSlim) {
    return featurePermissions.expansionRules.canUpdate(user, expansionRule);
  }

  function toggleRule(event: CustomEvent<DataGridRowSelection<ExpansionRuleSlim>>) {
    const {
      detail: { data: clickedRule, isSelected },
    } = event;

    if (isSelected) {
      selectedExpansionRule = clickedRule;
    } else if (selectedExpansionRule?.id === clickedRule.id) {
      selectedExpansionRule = null;
    }
  }

  function toggleSet(event: CustomEvent<DataGridRowSelection<ExpansionSet>>) {
    const {
      detail: { data: clickedSet, isSelected },
    } = event;

    selectedExpansionRule = null;

    if (isSelected) {
      selectedExpansionSet = clickedSet;
    } else if (selectedExpansionSet?.id === clickedSet.id) {
      selectedExpansionSet = null;
    }
  }
</script>

<CssGrid bind:columns={$expansionSetsColumns}>
  <CssGrid rows="1fr 3px 1fr">
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>Expansion Sets</SectionTitle>

        <div class="right">
          <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/expansion/sets/new`)}>
            New
          </button>
        </div>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if $expansionSets.length}
          <SingleActionDataGrid
            columnDefs={expansionSetColumnDefs}
            hasDeletePermission={hasDeleteExpansionSetPermission}
            itemDisplayText="Expansion Set"
            items={$expansionSets}
            {user}
            on:deleteItem={deleteSetContext}
            on:rowSelected={toggleSet}
          />
        {:else}
          No Expansion Sets Found
        {/if}
      </svelte:fragment>
    </Panel>

    <CssGridGutter track={1} type="row" />

    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>Expansion Rules</SectionTitle>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if selectedExpansionSet}
          <DataGrid
            bind:redrawRows
            columnDefs={expansionRuleColumnDefs}
            rowData={selectedExpansionSet?.expansion_rules}
            rowSelection="single"
            selectedRowIds={selectedExpansionRuleIds}
            on:rowSelected={toggleRule}
          />
        {:else}
          No Expansion Set Selected
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>

  <CssGridGutter track={1} type="column" />

  <ExpansionLogicEditor
    readOnly={true}
    ruleActivityType={selectedExpansionRule?.activity_type}
    ruleDictionaryId={selectedExpansionRule?.authoring_command_dict_id}
    ruleLogic={selectedExpansionRule?.expansion_logic ?? 'No Expansion Rule Selected'}
    ruleModelId={selectedExpansionRule?.authoring_mission_model_id}
    title="Expansion Rule - Logic Editor (Read-only)"
    {user}
  />
</CssGrid>
