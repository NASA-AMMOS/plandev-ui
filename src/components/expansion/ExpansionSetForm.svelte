<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import { dictionaries, expansionSetsColumns, models, savingExpansionSet } from '../../stores/expansion';
  import req from '../../utilities/requests';

  export let mode: 'create' | 'edit' = 'create';

  let activityTypesExpansionRules: ActivityTypeExpansionRules[] = [];
  let lastSelectedExpansionRule: ExpansionRule | null = null;
  let logicEditorRuleLogic: string = 'No Expansion Rule Selected';
  let logicEditorTitle: string = 'Expansion Rule - Logic Editor (Read-only)';
  let saveButtonEnabled: boolean = false;
  let selectedExpansionRules: Record<string, number> = {};
  let setExpansionRuleIds: number[] = [];
  let setDictionaryId: number | null = null;
  let setModelId: number | null = null;

  $: req
    .getActivityTypesExpansionRules(setModelId)
    .then(activityTypes => (activityTypesExpansionRules = activityTypes));

  $: logicEditorRuleLogic = lastSelectedExpansionRule?.expansion_logic ?? 'No Expansion Rule Selected';
  $: logicEditorTitle = lastSelectedExpansionRule
    ? `Expansion Rule - Logic Editor - ${lastSelectedExpansionRule.activity_type} - Rule ${lastSelectedExpansionRule.id} (Read-only)`
    : 'Expansion Rule - Logic Editor (Read-only)';
  $: setExpansionRuleIds = Object.values(selectedExpansionRules) ?? [];
  $: saveButtonEnabled = setDictionaryId !== null && setModelId !== null && setExpansionRuleIds.length > 0;

  async function saveSet() {
    if (mode === 'create') {
      const newSetId = await req.createExpansionSet(setDictionaryId, setModelId, setExpansionRuleIds);

      if (newSetId !== null) {
        goto(`/expansion/sets`);
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
  }
</script>

<CssGrid bind:columns={$expansionSetsColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <Chip>New Expansion Set</Chip>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto('/expansion/sets')}>
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
          {#each $dictionaries as dictionary}
            <option value={dictionary.id}>
              {dictionary.mission} -
              {dictionary.version}
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

      <fieldset>
        <label for="expansionRules" class="mb-2" style:display="block">Expansion Rules</label>

        {#if !activityTypesExpansionRules.length}
          No Expansion Rules Found
        {:else}
          <table class="st-table">
            <thead>
              <tr>
                <th>Activity Type</th>
                <th>Expansion Rule</th>
              </tr>
            </thead>

            <tbody>
              {#each activityTypesExpansionRules as activityType}
                <tr>
                  {#if activityType.expansion_rules.length}
                    <td>{activityType.name}</td>
                    <td>
                      {#each activityType.expansion_rules as rule}
                        <div
                          class="expansion-rule"
                          on:click|stopPropagation={() => selectExpansionRule(activityType.name, rule)}
                        >
                          <input
                            checked={selectedExpansionRules[activityType.name] === rule.id}
                            name={activityType.name}
                            type="checkbox"
                          />Rule {rule.id}
                        </div>
                      {/each}
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <ExpansionLogicEditor readOnly={true} ruleLogic={logicEditorRuleLogic} title={logicEditorTitle} />
</CssGrid>

<style>
  .expansion-rule {
    align-items: center;
    cursor: pointer;
    display: flex;
    gap: 5px;
    user-select: none;
  }

  .expansion-rule > input {
    cursor: pointer;
  }
</style>
