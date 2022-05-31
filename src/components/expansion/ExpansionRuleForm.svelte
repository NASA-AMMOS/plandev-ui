<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import {
    activityTypeNames,
    dictionaries,
    models,
    expansionRulesColumns,
    savingExpansionRule,
  } from '../../stores/expansion';
  import effects from '../../utilities/effects';

  export let initialRuleActivityType: string | null = null;
  export let initialRuleDictionaryId: number | null = null;
  export let initialRuleId: number | null = null;
  export let initialRuleLogic: string = 'export default (): ExpansionReturn => {\n    return [];\n}\n';
  export let initialRuleModelId: number | null = null;
  export let mode: 'create' | 'edit' = 'create';

  let ruleActivityType: string | null = initialRuleActivityType;
  let ruleDictionaryId: number | null = initialRuleDictionaryId;
  let ruleId: number | null = initialRuleId;
  let ruleLogic: string = initialRuleLogic;
  let ruleModelId: number | null = initialRuleModelId;
  let saveButtonEnabled: boolean = false;

  $: activityTypeNames.setVariables({ modelId: ruleModelId ?? -1 });
  $: saveButtonEnabled = ruleActivityType !== null && ruleLogic !== '';

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    ruleLogic = value;
  }

  async function saveRule() {
    if (mode === 'create') {
      const newRule: ExpansionRuleInsertInput = {
        activity_type: ruleActivityType,
        authoring_command_dict_id: ruleDictionaryId,
        authoring_mission_model_id: ruleModelId,
        expansion_logic: ruleLogic,
      };
      const newRuleId = await effects.createExpansionRule(newRule);

      if (newRuleId !== null) {
        goto(`/expansion/rules/edit/${newRuleId}`);
      }
    } else if (mode === 'edit') {
      const updatedRule: Partial<ExpansionRule> = {
        activity_type: ruleActivityType,
        authoring_command_dict_id: ruleDictionaryId,
        authoring_mission_model_id: ruleModelId,
        expansion_logic: ruleLogic,
      };
      await effects.updateExpansionRule(ruleId, updatedRule);
    }
  }
</script>

<CssGrid bind:columns={$expansionRulesColumns}>
  <Panel overflowYBody="hidden">
    <svelte:fragment slot="header">
      <Chip>{mode === 'create' ? 'New Expansion Rule' : 'Edit Expansion Rule'}</Chip>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto('/expansion/rules')}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button class="st-button secondary ellipsis" disabled={!saveButtonEnabled} on:click={saveRule}>
          {$savingExpansionRule ? 'Saving...' : 'Save'}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if mode === 'edit'}
        <fieldset>
          <label for="id">Rule ID</label>
          <Input>
            <input class="st-input w-100" disabled name="ruleId" value={ruleId} />
            <i class="bi bi-lock-fill" slot="right" />
          </Input>
        </fieldset>
      {/if}

      <fieldset>
        <label for="commandDictionary">Command Dictionary</label>
        <select bind:value={ruleDictionaryId} class="st-select w-100" name="commandDictionary">
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
          bind:value={ruleModelId}
          class="st-select w-100"
          name="modelId"
          on:change={() => (ruleActivityType = null)}
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
        <label for="activityType">Activity Type</label>
        <select bind:value={ruleActivityType} class="st-select w-100" name="activityType">
          <option value={null} />
          {#each $activityTypeNames as { name: activityTypeName }}
            <option value={activityTypeName}>
              {activityTypeName}
            </option>
          {/each}
        </select>
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <ExpansionLogicEditor
    {ruleActivityType}
    {ruleDictionaryId}
    {ruleLogic}
    {ruleModelId}
    title="{mode === 'create' ? 'New' : 'Edit'} Expansion Rule - Logic Editor"
    on:didChangeModelContent={onDidChangeModelContent}
  />
</CssGrid>
