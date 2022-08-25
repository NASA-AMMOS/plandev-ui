<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { expansionRules, expansionRulesColumns } from '../../stores/expansion';
  import effects from '../../utilities/effects';
  import { compare } from '../../utilities/generic';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';

  type CellRendererParams = {
    deleteRule: (rule: ExpansionRule) => void;
    editRule: (rule: ExpansionRule) => void;
  };
  type ExpansionRuleCellRendererParams = ICellRendererParams<ExpansionRule> & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      headerName: 'Rule ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 65,
    },
    { field: 'activity_type', headerName: 'Activity Type', resizable: true, sortable: true },
    {
      field: 'authoring_command_dict_id',
      headerName: 'Command Dictionary ID',
      resizable: true,
      sortable: true,
    },
    { field: 'authoring_mission_model_id', headerName: 'Model ID', sortable: true },
    { field: 'created_at', headerName: 'Created At', resizable: true, sortable: true },
    { field: 'updated_at', headerName: 'Updated At', resizable: true, sortable: true },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ExpansionRuleCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteRule,
            deleteTooltip: {
              content: 'Delete Rule',
              placement: 'bottom',
            },
            editCallback: params.editRule,
            editTooltip: {
              content: 'Edit Rule',
              placement: 'bottom',
            },
            rowData: params.data,
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteRule,
        editRule,
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

  let filteredRules: ExpansionRule[] = [];
  let filterText: string = '';
  let selectedExpansionRule: ExpansionRule | null = null;
  let sortedRules: ExpansionRule[] = [];

  $: filteredRules = $expansionRules.filter(rule => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesActivityType = rule.activity_type.toLocaleLowerCase().includes(filterTextLowerCase);
    const includesId = `${rule.id}`.includes(filterTextLowerCase);
    return includesActivityType || includesId;
  });
  $: sortedRules = filteredRules.sort((a, b) => compare(a.id, b.id));

  async function deleteRule({ id }: ExpansionRule) {
    const success = await effects.deleteExpansionRule(id);

    if (success) {
      sortedRules = sortedRules.filter(rule => rule.id !== id);

      if (id === selectedExpansionRule?.id) {
        selectedExpansionRule = null;
      }
    }
  }

  function editRule({ id }: ExpansionRule) {
    goto(`${base}/expansion/rules/edit/${id}`);
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
</script>

<CssGrid bind:columns={$expansionRulesColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <Chip>Expansion Rules</Chip>

      <Input>
        <input
          bind:value={filterText}
          class="st-input"
          placeholder="Filter rules"
          style="max-width: 300px; width: 100%;"
        />
      </Input>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/expansion/rules/new`)}> New </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if sortedRules.length}
        <DataGrid {columnDefs} rowData={sortedRules} rowSelection="single" on:rowSelected={toggleRule} />
      {:else}
        No Rules Found
      {/if}
    </svelte:fragment>
  </Panel>

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
