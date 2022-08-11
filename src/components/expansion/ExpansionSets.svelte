<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { expansionSets, expansionSetsColumns } from '../../stores/expansion';
  import effects from '../../utilities/effects';
  import { compare } from '../../utilities/generic';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid.svelte';
  import DataGridActions from '../ui/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';

  type CellRendererParams = {
    deleteSet: (sequence: ExpansionSet) => void;
  };
  type ExpansionSetCellRendererParams = ICellRendererParams & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      headerName: 'Set ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 100,
    },
    { field: 'command_dict_id', headerName: 'Command Dictionary ID', resizable: true, sortable: true },
    { field: 'mission_model_id', headerName: 'Model ID', resizable: true, sortable: true },
    { field: 'created_at', headerName: 'Created At', resizable: true, sortable: true },
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

  let sortedSets: ExpansionSet[] = [];
  let selectedExpansionRule: ExpansionRule | null = null;
  let selectedExpansionRuleIds: number[] = [];
  let selectedExpansionSet: ExpansionSet | null = null;

  $: sortedSets = $expansionSets.sort((a, b) => compare(a.id, b.id));
  $: selectedExpansionRuleIds = selectedExpansionRule ? [selectedExpansionRule.id] : [];

  async function deleteSet({ id }: ExpansionSet) {
    const success = await effects.deleteExpansionSet(id);

    if (success) {
      sortedSets = sortedSets.filter(set => set.id !== id);

      if (id === selectedExpansionSet?.id) {
        selectedExpansionRule = null;
        selectedExpansionSet = null;
      }
    }
  }

  function toggleRule(clickedRule: ExpansionRule, isSelected: boolean) {
    if (selectedExpansionRule?.id === clickedRule.id) {
      selectedExpansionRule = null;
    } else if (isSelected) {
      selectedExpansionRule = clickedRule;
    }
  }

  function toggleSet(clickedSet: ExpansionSet, isSelected: boolean) {
    selectedExpansionRule = null;

    if (selectedExpansionSet?.id === clickedSet.id) {
      selectedExpansionSet = null;
    } else if (isSelected) {
      selectedExpansionSet = clickedSet;
    }
  }
</script>

<CssGrid bind:columns={$expansionSetsColumns}>
  <CssGrid rows="1fr 1px 1fr">
    <Panel>
      <svelte:fragment slot="header">
        <Chip>Expansion Sets</Chip>

        <div class="right">
          <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/expansion/sets/new`)}>
            New
          </button>
        </div>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if sortedSets.length}
          <DataGrid
            {columnDefs}
            rowData={sortedSets}
            rowSelection="single"
            on:rowSelected={({ detail }) => toggleSet(detail.data, detail.isSelected)}
          />
        {:else}
          No Expansion Sets Found
        {/if}
      </svelte:fragment>
    </Panel>

    <CssGridGutter track={1} type="row" />

    <Panel>
      <svelte:fragment slot="header">
        <Chip>Expansion Rules</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if selectedExpansionSet}
          <DataGrid
            columnDefs={[
              {
                field: 'id',
                headerName: 'Rule ID',
                resizable: true,
                sortable: true,
                suppressAutoSize: true,
                suppressSizeToFit: true,
                width: 65,
              },
              { field: 'activity_type', headerName: 'Activity Type', sortable: true },
            ]}
            rowData={selectedExpansionSet?.expansion_rules}
            rowSelection="single"
            selectedRowIds={selectedExpansionRuleIds}
            on:rowSelected={({ detail }) => {
              toggleRule(detail.data, detail.isSelected);
            }}
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
