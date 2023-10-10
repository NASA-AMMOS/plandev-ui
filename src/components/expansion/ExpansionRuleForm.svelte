<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { createExpansionRuleError, expansionRulesFormColumns, savingExpansionRule } from '../../stores/expansion';
  import { activityTypes, models } from '../../stores/plan';
  import { commandDictionaries } from '../../stores/sequencing';
  import { tags } from '../../stores/tags';
  import type { User, UserId } from '../../types/app';
  import type { ExpansionRule, ExpansionRuleInsertInput, ExpansionRuleSetInput } from '../../types/expansion';
  import type { ExpansionRuleTagsInsertInput, Tag, TagsChangeEvent } from '../../types/tags';
  import effects from '../../utilities/effects';
  import { isSaveEvent } from '../../utilities/keyboardEvents';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions, isUserAdmin } from '../../utilities/permissions';
  import { diffTags } from '../../utilities/tags';
  import PageTitle from '../app/PageTitle.svelte';
  import AlertError from '../ui/AlertError.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import TagsInput from '../ui/Tags/TagsInput.svelte';
  import ExpansionLogicEditor from './ExpansionLogicEditor.svelte';

  export let initialRuleActivityType: string | null = null;
  export let initialRuleDescription: string | null = null;
  export let initialRuleCreatedAt: string | null = null;
  export let initialRuleDictionaryId: number | null = null;
  export let initialRuleId: number | null = null;
  export let initialRuleLogic: string =
    'export default function MyExpansion(props: {\n  activityInstance: ActivityType\n}): ExpansionReturn {\n  const { activityInstance } = props;\n  return [];\n}\n';
  export let initialRuleModelId: number | null = null;
  export let initialRuleName: string = '';
  export let initialRuleOwner: UserId = null;
  export let initialRuleTags: Tag[] = [];
  export let initialRuleUpdatedAt: string | null = null;
  export let mode: 'create' | 'edit' = 'create';
  export let user: User | null;

  const authoringPermissionError = 'Only an admin can edit this field';

  let hasPermission: boolean = false;
  let hasAuthoringPermission: boolean = false;
  let pageTitle: string = '';
  let permissionError = 'You do not have permission to edit this expansion rule.';
  let ruleActivityType: string | null = initialRuleActivityType;
  let ruleCreatedAt: string | null = initialRuleCreatedAt;
  let ruleDescription: string | null = initialRuleDescription;
  let ruleDictionaryId: number | null = initialRuleDictionaryId;
  let ruleId: number | null = initialRuleId;
  let ruleLogic: string = initialRuleLogic;
  let ruleModelId: number | null = initialRuleModelId;
  let ruleName: string = initialRuleName;
  let ruleOwner: UserId = initialRuleOwner;
  let ruleTags: Tag[] | null = initialRuleTags;
  let ruleUpdatedAt: string | null = initialRuleUpdatedAt;
  let saveButtonClass: 'primary' | 'secondary' = 'primary';
  let saveButtonEnabled: boolean = false;
  let saveButtonText: string = 'Save';
  let savedRule: Partial<ExpansionRule> = {
    ...(ruleActivityType !== null ? { activity_type: ruleActivityType } : {}),
    ...(ruleDictionaryId !== null ? { authoring_command_dict_id: ruleDictionaryId } : {}),
    ...(ruleModelId !== null ? { authoring_mission_model_id: ruleModelId } : {}),
    ...(ruleDescription !== null ? { description: ruleDescription } : {}),
    expansion_logic: ruleLogic,
    name: ruleName,
    tags: ruleTags.map(tag => ({ tag })),
  };

  $: activityTypes.setVariables({ modelId: ruleModelId ?? -1 });
  $: hasPermission = hasExpansionPermission(ruleOwner, mode, user);
  $: ruleModified = diffRule(savedRule, {
    ...(ruleActivityType !== null ? { activity_type: ruleActivityType } : {}),
    ...(ruleDictionaryId !== null ? { authoring_command_dict_id: ruleDictionaryId } : {}),
    ...(ruleModelId !== null ? { authoring_mission_model_id: ruleModelId } : {}),
    ...(ruleDescription !== null ? { description: ruleDescription } : {}),
    expansion_logic: ruleLogic,
    name: ruleName,
    tags: (ruleTags || []).map(tag => ({ tag })),
  });
  $: saveButtonClass = ruleModified && saveButtonEnabled ? 'primary' : 'secondary';
  $: saveButtonEnabled = ruleActivityType !== null && ruleLogic !== '' && ruleName !== '';
  $: saveButtonText = mode === 'edit' && !ruleModified ? 'Saved' : 'Save';
  $: {
    hasAuthoringPermission = mode === 'edit' ? isUserAdmin(user) : true;
    pageTitle = mode === 'edit' ? 'Edit Expansion Rule' : 'New Expansion Rule';
    permissionError = `You do not have permission to ${mode === 'edit' ? 'edit this' : 'create a'} expansion rule.`;
  }

  onMount(() => {
    createExpansionRuleError.set(null);
  });

  function diffRule(ruleA: Partial<ExpansionRule>, ruleB: Partial<ExpansionRule>) {
    return Object.entries(ruleA).some(([key, value]) => {
      if (key === 'tags') {
        return diffTags(
          (ruleA.tags || []).map(({ tag }) => tag),
          (ruleB.tags || []).map(({ tag }) => tag),
        );
      } else {
        return ruleB[key as keyof ExpansionRule] !== value;
      }
    });
  }

  function hasExpansionPermission(owner: UserId | null, mode: 'create' | 'edit', user: User | null): boolean {
    if (user) {
      if (mode === 'create') {
        return featurePermissions.expansionRules.canCreate(user);
      } else if (owner !== null) {
        return featurePermissions.expansionRules.canUpdate(user, { owner });
      }
    }
    return false;
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    ruleLogic = value;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      saveRule();
    }
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      ruleTags = (ruleTags || []).filter(t => t.name !== tag.name);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      ruleTags = (ruleTags || []).concat(tagsToAdd);
    }
  }

  async function saveRule() {
    if (saveButtonEnabled) {
      if (mode === 'create') {
        if (ruleActivityType !== null && ruleDictionaryId !== null && ruleModelId !== null) {
          const newRule: ExpansionRuleInsertInput = {
            activity_type: ruleActivityType,
            authoring_command_dict_id: ruleDictionaryId,
            authoring_mission_model_id: ruleModelId,
            description: ruleDescription ?? '',
            expansion_logic: ruleLogic,
            name: ruleName,
          };
          const newRuleId = await effects.createExpansionRule(newRule, user);

          if (newRuleId !== null) {
            // Associate new tags with expansion rule
            const newExpansionRuleTags: ExpansionRuleTagsInsertInput[] = (ruleTags || []).map(({ id: tag_id }) => ({
              rule_id: newRuleId,
              tag_id,
            }));
            await effects.createExpansionRuleTags(newExpansionRuleTags, user);
            goto(`${base}/expansion/rules/edit/${newRuleId}`);
          }
        }
      } else if (mode === 'edit') {
        if (ruleId !== null && ruleCreatedAt !== null && ruleTags !== null) {
          const updatedRule: ExpansionRuleSetInput = {
            ...(hasAuthoringPermission && ruleActivityType !== null ? { activity_type: ruleActivityType } : {}),
            ...(hasAuthoringPermission && ruleDictionaryId !== null
              ? { authoring_command_dict_id: ruleDictionaryId }
              : {}),
            ...(hasAuthoringPermission && ruleModelId !== null ? { authoring_mission_model_id: ruleModelId } : {}),
            ...(ruleDescription !== null ? { description: ruleDescription } : {}),
            expansion_logic: ruleLogic,
            name: ruleName,
            owner: ruleOwner,
          };
          const updated_at = await effects.updateExpansionRule(ruleId, updatedRule, user);
          if (updated_at !== null) {
            // Associate new tags with expansion rule
            const newExpansionRuleTags: ExpansionRuleTagsInsertInput[] = (ruleTags || []).map(({ id: tag_id }) => ({
              rule_id: ruleId as number,
              tag_id,
            }));
            await effects.createExpansionRuleTags(newExpansionRuleTags, user);

            // Disassociate old tags from constraint
            const unusedTags = initialRuleTags
              .filter(tag => !(ruleTags || []).find(t => tag.id === t.id))
              .map(tag => tag.id);
            await effects.deleteExpansionRuleTags(unusedTags, user);

            ruleUpdatedAt = updated_at;
            savedRule = { ...updatedRule, tags: (ruleTags || []).map(tag => ({ tag })) };
          }
        }
      }
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<PageTitle title={pageTitle} />

<CssGrid bind:columns={$expansionRulesFormColumns}>
  <Panel padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>{mode === 'create' ? 'New Expansion Rule' : 'Edit Expansion Rule'}</SectionTitle>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/expansion/rules`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button
          class="st-button {saveButtonClass} ellipsis"
          disabled={!saveButtonEnabled}
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
          on:click={saveRule}
        >
          {$savingExpansionRule ? 'Saving...' : saveButtonText}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <AlertError class="m-2" error={$createExpansionRuleError} />

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
        <select
          bind:value={ruleDictionaryId}
          class="st-select w-100"
          name="commandDictionary"
          use:permissionHandler={{
            hasPermission: hasAuthoringPermission,
            permissionError: authoringPermissionError,
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
          bind:value={ruleModelId}
          class="st-select w-100"
          name="modelId"
          on:change={() => (ruleActivityType = null)}
          use:permissionHandler={{
            hasPermission: hasAuthoringPermission,
            permissionError: authoringPermissionError,
          }}
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
        <select
          bind:value={ruleActivityType}
          class="st-select w-100"
          name="activityType"
          use:permissionHandler={{
            hasPermission: hasAuthoringPermission,
            permissionError: authoringPermissionError,
          }}
        >
          <option value={null} />
          {#each $activityTypes as { name: activityTypeName }}
            <option value={activityTypeName}>
              {activityTypeName}
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="name">Name</label>
        <input
          autocomplete="off"
          bind:value={ruleName}
          class="st-input w-100"
          name="name"
          placeholder="Enter a rule name (required)"
          required
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="description">Description</label>
        <textarea
          bind:value={ruleDescription}
          autocomplete="off"
          class="st-input w-100"
          name="description"
          placeholder="Enter a rule description (optional)"
          required
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="tags">Tags</label>
        <TagsInput
          use={[
            [
              permissionHandler,
              {
                hasPermission,
                permissionError,
              },
            ],
          ]}
          options={$tags}
          selected={ruleTags || []}
          on:change={onTagsInputChange}
        />
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <ExpansionLogicEditor
    {ruleActivityType}
    {ruleDictionaryId}
    {ruleLogic}
    {ruleModelId}
    readOnly={!hasPermission}
    title="{mode === 'create' ? 'New' : 'Edit'} Expansion Rule - Logic Editor"
    {user}
    on:didChangeModelContent={onDidChangeModelContent}
  />
</CssGrid>
