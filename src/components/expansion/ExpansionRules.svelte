<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams } from 'ag-grid-community';
  import { expansionRules, expansionRulesColumns } from '../../stores/expansion';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { ExpansionRule } from '../../types/expansion';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import Input from '../form/Input.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';

  export let user: User | null;

  type CellRendererParams = {
    deleteRule: (rule: ExpansionRule) => void;
    editRule: (rule: ExpansionRule) => void;
  };
  type ExpansionRuleCellRendererParams = ICellRendererParams<ExpansionRule> & CellRendererParams;

  const baseColumnDefs: DataGridColumnDef[] = [
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
      field: 'name',
      filter: 'text',
      headerName: 'Name',
      minWidth: 120,
      resizable: true,
      sortable: true,
    },
    {
      field: 'activity_type',
      filter: 'text',
      headerName: 'Activity Type',
      minWidth: 200,
      resizable: true,
      sortable: true,
    },
    {
      field: 'authoring_command_dict_id',
      filter: 'number',
      headerName: 'Command Dictionary ID',
      resizable: true,
      sortable: true,
    },
    { field: 'authoring_mission_model_id', filter: 'number', headerName: 'Model ID', sortable: true },
    { field: 'owner', filter: 'text', headerName: 'Owner', resizable: true, sortable: true },
    { field: 'updated_by', filter: 'text', headerName: 'Updated By', resizable: true, sortable: true },
    { field: 'description', filter: 'text', headerName: 'Description', resizable: true, sortable: true },
  ];

  let columnDefs = baseColumnDefs;
  let filteredRules: ExpansionRule[] = [];
  let filterText: string = '';
  let selectedExpansionRule: ExpansionRule | null = null;

  $: columnDefs = [
    ...baseColumnDefs,
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
            hasDeletePermission: params.data ? hasDeletePermission(user, params.data) : false,
            hasEditPermission: params.data ? hasEditPermission(user, params.data) : false,
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
  $: filteredRules = $expansionRules.filter(rule => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesActivityType = rule.activity_type.toLocaleLowerCase().includes(filterTextLowerCase);
    const includesId = `${rule.id}`.includes(filterTextLowerCase);
    return includesActivityType || includesId;
  });

  async function deleteRule({ id }: Pick<ExpansionRule, 'id'>) {
    const success = await effects.deleteExpansionRule(id, user);

    if (success) {
      expansionRules.filterValueById(id);

      if (id === selectedExpansionRule?.id) {
        selectedExpansionRule = null;
      }
    }
  }

  function deleteRuleContext(event: CustomEvent<RowId[]>) {
    deleteRule({ id: event.detail[0] as number });
  }

  function hasDeletePermission(user: User | null, expansionRule: ExpansionRule) {
    return featurePermissions.expansionRules.canDelete(user, expansionRule);
  }

  function hasEditPermission(user: User | null, expansionRule: ExpansionRule) {
    return featurePermissions.expansionRules.canUpdate(user, expansionRule);
  }

  function editRule({ id }: Pick<ExpansionRule, 'id'>) {
    goto(`${base}/expansion/rules/edit/${id}`);
  }

  function editRuleContext(event: CustomEvent<RowId[]>) {
    editRule({ id: event.detail[0] as number });
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
      <SectionTitle>Expansion Rules</SectionTitle>

      <Input>
        <input bind:value={filterText} class="st-input" placeholder="Filter rules" style="width: 100%;" />
      </Input>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/expansion/rules/new`)}> New </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if filteredRules.length}
        <SingleActionDataGrid
          {columnDefs}
          hasEdit={true}
          {hasDeletePermission}
          {hasEditPermission}
          itemDisplayText="Rule"
          items={filteredRules}
          {user}
          on:deleteItem={deleteRuleContext}
          on:editItem={editRuleContext}
          on:rowSelected={toggleRule}
        />
      {:else}
        <div class="st-typography-label">No Rules Found</div>
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
    {user}
  />
</CssGrid>
