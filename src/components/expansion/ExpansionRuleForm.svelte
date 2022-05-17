<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import { activityTypeNames, dictionaries, models, expansionActions } from '../../stores/expansion';
  import req from '../../utilities/requests';

  export let initialRuleActivityType: string | null = null;
  export let initialRuleDictionaryId: number | null = null;
  export let initialRuleId: number | null = null;
  export let initialRuleLogic: string = 'export default (): ExpansionReturn => {\n    return [];\n}\n';
  export let initialRuleModelId: number | null = null;
  export let mode: 'create' | 'edit' = 'create';

  let activityTypeScript: string = '';
  let commandTypeScript: string = '';
  let ruleActivityType: string | null = initialRuleActivityType;
  let ruleDictionaryId: number | null = initialRuleDictionaryId;
  let ruleId: number | null = initialRuleId;
  let ruleLogic: string = initialRuleLogic;
  let ruleModelId: number | null = initialRuleModelId;
  let saveButtonEnabled: boolean = false;
  let saving: boolean = false;

  $: activityTypeNames.setVariables({ modelId: ruleModelId ?? -1 });
  $: req.getCommandTypeScript(ruleDictionaryId).then(typeScript => (commandTypeScript = typeScript));
  $: req.getActivityTypeScript(ruleActivityType, ruleModelId).then(typeScript => (activityTypeScript = typeScript));
  $: saveButtonEnabled = ruleActivityType !== null && ruleLogic !== '';

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    ruleLogic = value;
  }

  async function saveRule() {
    saving = true;
    if (mode === 'create') {
      const newRuleId = await expansionActions.createExpansionRule(
        ruleActivityType,
        ruleLogic,
        ruleDictionaryId,
        ruleModelId,
      );

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
      await expansionActions.updateExpansionRule(ruleId, updatedRule);
    }
    saving = false;
  }
</script>

<CssGrid columns="1fr 3fr">
  <Panel borderRight overflowYBody="hidden">
    <svelte:fragment slot="header">
      <Chip>{mode === 'create' ? 'New Expansion Rule' : 'Edit Expansion Rule'}</Chip>
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

  <ExpansionLogicEditor
    {activityTypeScript}
    {commandTypeScript}
    {ruleLogic}
    on:didChangeModelContent={onDidChangeModelContent}
  >
    <button class="st-button secondary ellipsis" on:click={() => goto('/expansion/rules')}>
      <i class="bi bi-x-square" style="font-size: 0.8rem" />
      {mode === 'create' ? 'Cancel' : 'Close'}
    </button>
    <button class="st-button secondary ellipsis" disabled={!saveButtonEnabled} on:click={saveRule}>
      <i class="bi bi bi-save" style="font-size: 0.8rem" />
      {saving ? 'Saving...' : 'Save'}
    </button>
  </ExpansionLogicEditor>
</CssGrid>
