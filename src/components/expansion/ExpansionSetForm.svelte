<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { expansionSetsFormColumns, savingExpansionSet } from '../../stores/expansion';
  import { models } from '../../stores/plan';
  import { commandDictionaries } from '../../stores/sequencing';
  import type { ActivityTypeExpansionRules } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExpansionRuleSlim } from '../../types/expansion';
  import type { ModelSlim } from '../../types/model';
  import type { PlanSlim } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';
  import ExpansionSetRuleSelection from './ExpansionSetRuleSelection.svelte';

  export let mode: 'create' | 'edit' = 'create';
  export let plans: PlanSlim[];
  export let user: User | null;

  type CellRendererParams = {
    selectExpansionRule: (name: string, rule: ExpansionRuleSlim) => void;
  };
  type ExpansionSetRuleSelectionRendererParams = ICellRendererParams<ActivityTypeExpansionRules> & CellRendererParams;

  let activityTypesExpansionRules: ActivityTypeExpansionRules[] = [];
  let dataGrid: DataGrid<ActivityTypeExpansionRules>;
  let hasPermission: boolean = false;
  let lastSelectedExpansionRule: ExpansionRuleSlim | null = null;
  let logicEditorActivityType: string | null = null;
  let logicEditorRuleLogic: string = 'No Expansion Rule Selected';
  let logicEditorTitle: string = 'Expansion Rule - Logic Editor (Read-only)';
  let permissionError = 'You do not have permission to edit this expansion set.';
  let saveButtonEnabled: boolean = false;
  let selectedExpansionRules: Record<string, number> = {};
  let setExpansionRuleIds: number[] = [];
  let setDictionaryId: number | null = null;
  let setModelId: number | null = null;
  let setName: string = '';
  let setDescription: string = '';
  let selectedModel: ModelSlim | undefined;

  $: effects
    .getActivityTypesExpansionRules(setModelId, user)
    .then(activity_types => (activityTypesExpansionRules = activity_types));

  $: logicEditorActivityType = lastSelectedExpansionRule?.activity_type ?? null;
  $: logicEditorRuleLogic = lastSelectedExpansionRule?.expansion_logic ?? 'No Expansion Rule Selected';
  $: logicEditorTitle = lastSelectedExpansionRule
    ? `Expansion Rule - Logic Editor - ${lastSelectedExpansionRule.activity_type} - Rule ${lastSelectedExpansionRule.id} (Read-only)`
    : 'Expansion Rule - Logic Editor (Read-only)';
  $: setExpansionRuleIds = Object.values(selectedExpansionRules) ?? [];
  $: selectedModel = $models.find(model => model.id === setModelId);
  $: saveButtonEnabled = setDictionaryId !== null && setModelId !== null && setExpansionRuleIds.length > 0;
  $: {
    if (mode === 'edit') {
      hasPermission = featurePermissions.expansionSets.canUpdate();
    } else if (selectedModel !== undefined) {
      hasPermission = featurePermissions.expansionSets.canCreate(user, plans, selectedModel);
    }
    permissionError = `You do not have permission to ${mode === 'edit' ? 'edit this' : 'create an'} expansion set.`;
  }

  function hasModelPermission(modelId: number, user: User | null): boolean {
    const model = $models.find(model => model.id === modelId);
    if (user && model) {
      return featurePermissions.expansionSets.canCreate(user, plans, model);
    }

    return true;
  }

  async function saveSet() {
    if (mode === 'create' && setDictionaryId && selectedModel) {
      const newSetId = await effects.createExpansionSet(
        setDictionaryId,
        selectedModel,
        setExpansionRuleIds,
        user,
        plans,
        setName,
        setDescription,
      );

      if (newSetId !== null) {
        goto(`${base}/expansion/sets`);
      }
    }
  }

  function selectExpansionRule(activityTypeName: string, rule: ExpansionRuleSlim) {
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

<CssGrid bind:columns={$expansionSetsFormColumns}>
  <Panel padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>New Expansion Set</SectionTitle>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/expansion/sets`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button
          class="st-button secondary ellipsis"
          disabled={!saveButtonEnabled}
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
          on:click={saveSet}
        >
          {$savingExpansionSet ? 'Saving...' : 'Save'}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <fieldset>
        <label for="commandDictionary">Command Dictionary</label>
        <select
          bind:value={setDictionaryId}
          class="st-select w-100"
          name="commandDictionary"
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        >
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
            <option value={model.id} disabled={!hasModelPermission(model.id, user)}>
              {model.name}
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="name">Name</label>
        <input
          bind:value={setName}
          autocomplete="off"
          class="st-input w-100"
          name="name"
          placeholder="Enter Expansion Set Name (optional)"
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="description">Description</label>
        <textarea
          bind:value={setDescription}
          autocomplete="off"
          class="st-input w-100"
          name="description"
          placeholder="Enter Expansion Set Description (optional)"
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>

      <div class="expansion-rules-table-container">
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
      </div>
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

  .expansion-rules-table-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 0px 16px 8px;
  }
</style>
