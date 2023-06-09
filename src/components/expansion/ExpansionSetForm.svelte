<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { expansionSetsColumns, savingExpansionSet } from '../../stores/expansion';
  import { models } from '../../stores/plan';
  import { commandDictionaries } from '../../stores/sequencing';
  import type { ActivityTypeExpansionRules } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExpansionRule } from '../../types/expansion';
  import effects from '../../utilities/effects';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';
  import ExpansionSetRuleSelection from './ExpansionSetRuleSelection.svelte';

  export let mode: 'create' | 'edit' = 'create';
  export let user: User | null;

  type CellRendererParams = {
    selectExpansionRule: (name: string, rule: ExpansionRule) => void;
  };
  type ExpansionSetRuleSelectionRendererParams = ICellRendererParams<ActivityTypeExpansionRules> & CellRendererParams;

  let activityTypesExpansionRules: ActivityTypeExpansionRules[] = [];
  let dataGrid: DataGrid<ActivityTypeExpansionRules>;
  let lastSelectedExpansionRule: ExpansionRule | null = null;
  let logicEditorActivityType: string | null = null;
  let logicEditorRuleLogic: string = 'No Expansion Rule Selected';
  let logicEditorTitle: string = 'Expansion Rule - Logic Editor (Read-only)';
  let saveButtonEnabled: boolean = false;
  let selectedExpansionRules: Record<string, number> = {};
  let setExpansionRuleIds: number[] = [];
  let setDictionaryId: number | null = null;
  let setModelId: number | null = null;

  $: effects
    .getActivityTypesExpansionRules(setModelId, user)
    .then(activity_types => (activityTypesExpansionRules = activity_types));

  $: logicEditorActivityType = lastSelectedExpansionRule?.activity_type ?? null;
  $: logicEditorRuleLogic = lastSelectedExpansionRule?.expansion_logic ?? 'No Expansion Rule Selected';
  $: logicEditorTitle = lastSelectedExpansionRule
    ? `Expansion Rule - Logic Editor - ${lastSelectedExpansionRule.activity_type} - Rule ${lastSelectedExpansionRule.id} (Read-only)`
    : 'Expansion Rule - Logic Editor (Read-only)';
  $: setExpansionRuleIds = Object.values(selectedExpansionRules) ?? [];
  $: saveButtonEnabled = setDictionaryId !== null && setModelId !== null && setExpansionRuleIds.length > 0;

  async function saveSet() {
    if (mode === 'create' && setDictionaryId && setModelId) {
      const newSetId = await effects.createExpansionSet(setDictionaryId, setModelId, setExpansionRuleIds, user);

      if (newSetId !== null) {
        goto(`${base}/expansion/sets`);
      }
    }
  }

  function selectExpansionRule(activityTypeName: string, rule: ExpansionRule) {
    const currentRuleId = selectedExpansionRules[activityTypeName];

    if (currentRuleId === rule.id) {
      delete selectedExpansionRules[activityTypeName];
      lastSelectedExpansionRule = null;
    } else {
      selectedExpansionRules[activityTypeName] = rule.id;
      lastSelectedExpansionRule = rule;
    }

    selectedExpansionRules = { ...selectedExpansionRules };

    // because selectedExpansionRules isn't bound to the dataGrid,
    // we have to explicitly redraw the rows so that the checkboxes can update
    dataGrid.redrawRows();
  }

  const expansionSetRuleSelectionColumnDef: DataGridColumnDef = {
    autoHeight: true,
    cellRenderer: (params: ExpansionSetRuleSelectionRendererParams) => {
      const selectionDiv = document.createElement('div');
      if (params.data) {
        new ExpansionSetRuleSelection({
          props: {
            activityName: params.data.name,
            expansionRules: params.data.expansion_rules,
            selectExpansionRule: params.selectExpansionRule,
            selectedExpansionRules,
          },
          target: selectionDiv,
        });
      }

      return selectionDiv;
    },
    cellRendererParams: {
      selectExpansionRule,
    } as CellRendererParams,
    field: 'expansion_rules',
    filter: 'text',
    filterValueGetter: (params: ValueGetterParams<ActivityTypeExpansionRules>) => {
      return params.data?.expansion_rules.map(rule => `Rule ${rule.id}`).join(' ');
    },
    headerName: 'Expansion Rule',
    resizable: true,
  };
</script>

<CssGrid bind:columns={$expansionSetsColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>New Expansion Set</SectionTitle>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/expansion/sets`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button class="st-button secondary ellipsis" disabled={!saveButtonEnabled} on:click={saveSet}>
          {$savingExpansionSet ? 'Saving...' : 'Save'}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <fieldset>
        <label for="commandDictionary">Command Dictionary</label>
        <select bind:value={setDictionaryId} class="st-select w-100" name="commandDictionary">
          <option value={null} />
          {#each $commandDictionaries as commandDictionary}
            <option value={commandDictionary.id}>
              {commandDictionary.mission} -
              {commandDictionary.version}
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="modelId">Model</label>
        <select
          bind:value={setModelId}
          class="st-select w-100"
          name="modelId"
          on:change={() => (selectedExpansionRules = {})}
        >
          <option value={null} />
          {#each $models as model}
            <option value={model.id}>
              {model.name}
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset class="expansion-rules-table">
        <label for="expansionRules" class="mb-2 mt-2" style:display="block"> Expansion Rules </label>

        {#if !activityTypesExpansionRules.length}
          No Expansion Rules Found
        {:else}
          <DataGrid
            bind:this={dataGrid}
            columnDefs={[
              { field: 'name', filter: 'text', headerName: 'Activity Type', resizable: true, sortable: true },
              expansionSetRuleSelectionColumnDef,
            ]}
            useCustomContextMenu
            rowData={activityTypesExpansionRules.filter(activityType => activityType.expansion_rules.length > 0)}
            shouldAutoGenerateId={true}
            suppressRowClickSelection={true}
          />
        {/if}
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <ExpansionLogicEditor
    readOnly={true}
    ruleActivityType={logicEditorActivityType}
    ruleDictionaryId={setDictionaryId}
    ruleLogic={logicEditorRuleLogic}
    ruleModelId={setModelId}
    title={logicEditorTitle}
    {user}
  />
</CssGrid>

<style>
  .expansion-rules-table {
    display: contents;
  }

  .expansion-rules-table :global(.ag-theme-stellar .ag-row.ag-selectable-row) {
    cursor: auto;
  }

  .expansion-rules-table :global(.ag-theme-stellar .ag-row.ag-selectable-row input) {
    cursor: pointer;
  }
</style>
