<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { expansionRulesColumns, savingExpansionRule } from '../../stores/expansion';
  import { activityTypes, models } from '../../stores/plan';
  import { commandDictionaries } from '../../stores/sequencing';
  import effects from '../../utilities/effects';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';

  export let initialRuleActivityType: string | null = null;
  export let initialRuleCreatedAt: string | null = null;
  export let initialRuleDictionaryId: number | null = null;
  export let initialRuleId: number | null = null;
  export let initialRuleLogic: string =
    'export default function MyExpansion(props: {\n  activityInstance: ActivityType\n}): ExpansionReturn {\n  const { activityInstance } = props;\n  return [];\n}\n';
  export let initialRuleModelId: number | null = null;
  export let initialRuleUpdatedAt: string | null = null;
  export let mode: 'create' | 'edit' = 'create';

  let ruleActivityType: string | null = initialRuleActivityType;
  let ruleCreatedAt: string | null = initialRuleCreatedAt;
  let ruleDictionaryId: number | null = initialRuleDictionaryId;
  let ruleId: number | null = initialRuleId;
  let ruleLogic: string = initialRuleLogic;
  let ruleModelId: number | null = initialRuleModelId;
  let ruleUpdatedAt: string | null = initialRuleUpdatedAt;
  let saveButtonEnabled: boolean = false;
  let savedRule: Partial<ExpansionRule> = {
    activity_type: ruleActivityType,
    authoring_command_dict_id: ruleDictionaryId,
    authoring_mission_model_id: ruleModelId,
    expansion_logic: ruleLogic,
  };

  $: activityTypes.setVariables({ modelId: ruleModelId ?? -1 });
  $: saveButtonEnabled = ruleActivityType !== null && ruleLogic !== '';
  $: ruleModified = diffRule(savedRule, {
    activity_type: ruleActivityType,
    authoring_command_dict_id: ruleDictionaryId,
    authoring_mission_model_id: ruleModelId,
    expansion_logic: ruleLogic,
  });
  $: saveButtonText = mode === 'edit' && !ruleModified ? 'Saved' : 'Save';
  $: saveButtonClass = ruleModified && saveButtonEnabled ? 'primary' : 'secondary';

  function diffRule(ruleA: Partial<ExpansionRule>, ruleB: Partial<ExpansionRule>) {
    return Object.entries(ruleA).some(([key, value]) => {
      return ruleB[key] !== value;
    });
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    ruleLogic = value;
  }

  function onKeydown(event: KeyboardEvent): void {
    const { key, ctrlKey, metaKey } = event;
    if ((window.navigator.platform.match(/mac/i) ? metaKey : ctrlKey) && key === 's') {
      event.preventDefault();
      saveRule();
    }
  }

  async function saveRule() {
    if (saveButtonEnabled) {
      if (mode === 'create') {
        const newRule: ExpansionRuleInsertInput = {
          activity_type: ruleActivityType,
          authoring_command_dict_id: ruleDictionaryId,
          authoring_mission_model_id: ruleModelId,
          expansion_logic: ruleLogic,
        };
        const newRuleId = await effects.createExpansionRule(newRule);

        if (newRuleId !== null) {
          goto(`${base}/expansion/rules/edit/${newRuleId}`);
        }
      } else if (mode === 'edit') {
        const updatedRule: Partial<ExpansionRule> = {
          activity_type: ruleActivityType,
          authoring_command_dict_id: ruleDictionaryId,
          authoring_mission_model_id: ruleModelId,
          expansion_logic: ruleLogic,
        };
        const updated_at = await effects.updateExpansionRule(ruleId, updatedRule);
        if (updated_at !== null) {
          ruleUpdatedAt = updated_at;
          savedRule = updatedRule;
        }
      }
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<CssGrid bind:columns={$expansionRulesColumns}>
  <Panel overflowYBody="hidden">
    <svelte:fragment slot="header">
      <Chip>{mode === 'create' ? 'New Expansion Rule' : 'Edit Expansion Rule'}</Chip>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/expansion/rules`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button class="st-button {saveButtonClass} ellipsis" disabled={!saveButtonEnabled} on:click={saveRule}>
          {$savingExpansionRule ? 'Saving...' : saveButtonText}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if mode === 'edit'}
        <fieldset>
          <label for="ruleId">Rule ID</label>
          <input class="st-input w-100" disabled name="ruleId" value={ruleId} />
        </fieldset>

        <fieldset>
          <label for="createdAt">Created At</label>
          <input class="st-input w-100" disabled name="createdAt" value={ruleCreatedAt} />
        </fieldset>

        <fieldset>
          <label for="updatedAt">Updated At</label>
          <input class="st-input w-100" disabled name="updatedAt" value={ruleUpdatedAt} />
        </fieldset>
      {/if}

      <fieldset>
        <label for="commandDictionary">Command Dictionary</label>
        <select bind:value={ruleDictionaryId} class="st-select w-100" name="commandDictionary">
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
          {#each $activityTypes as { name: activityTypeName }}
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
