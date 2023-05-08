<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams } from 'ag-grid-community';
  import { expansionSets, expansionSetsColumns } from '../../stores/expansion';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { ExpansionRule, ExpansionSet } from '../../types/expansion';
  import effects from '../../utilities/effects';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';

  type CellRendererParams = {
    deleteSet: (sequence: ExpansionSet) => void;
  };
  type ExpansionSetCellRendererParams = ICellRendererParams<ExpansionSet> & CellRendererParams;

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
    {
      field: 'command_dict_id',
      filter: 'number',
      headerName: 'Command Dictionary ID',
      resizable: true,
      sortable: true,
    },
    { field: 'mission_model_id', filter: 'number', headerName: 'Model ID', resizable: true, sortable: true },
    { field: 'created_at', filter: 'text', headerName: 'Created At', resizable: true, sortable: true },
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

  let selectedExpansionRule: ExpansionRule | null = null;
  let selectedExpansionRuleIds: number[] = [];
  let selectedExpansionSet: ExpansionSet | null = null;

  $: selectedExpansionRuleIds = selectedExpansionRule ? [selectedExpansionRule.id] : [];

  async function deleteSet({ id }: Pick<ExpansionSet, 'id'>) {
    const success = await effects.deleteExpansionSet(id);

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

  function toggleRule(event: CustomEvent<DataGridRowSelection<ExpansionRule>>) {
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
            {columnDefs}
            itemDisplayText="Expansion Set"
            items={$expansionSets}
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
            columnDefs={[
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
            ]}
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
  />
</CssGrid>
