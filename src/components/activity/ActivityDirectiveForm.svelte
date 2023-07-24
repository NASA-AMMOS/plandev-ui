<svelte:options immutable={true} />

<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import { field } from '../../stores/form';
  import { plan } from '../../stores/plan';
  import type {
    ActivityDirective,
    ActivityDirectiveId,
    ActivityDirectivesMap,
    ActivityPresetId,
    ActivityPresetInsertInput,
    ActivityType,
  } from '../../types/activity';
  import type { ActivityMetadataDefinition } from '../../types/activity-metadata';
  import type { User } from '../../types/app';
  import type { FieldStore } from '../../types/form';
  import type { ArgumentsMap, FormParameter } from '../../types/parameter';
  import type { ActivityDirectiveTagsInsertInput, Tag, TagsChangeEvent } from '../../types/tags';
  import { getActivityMetadata } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { classNames, keyByBoolean } from '../../utilities/generic';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getDoyTime, getDoyTimeFromInterval, getIntervalFromDoyRange } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { required, timestamp } from '../../utilities/validators';
  import Collapse from '../Collapse.svelte';
  import ActivityMetadataField from '../activityMetadata/ActivityMetadataField.svelte';
  import DatePickerField from '../form/DatePickerField.svelte';
  import Field from '../form/Field.svelte';
  import Input from '../form/Input.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Highlight from '../ui/Highlight.svelte';
  import TagsInput from '../ui/Tags/Tags.svelte';
  import ActivityAnchorForm from './ActivityAnchorForm.svelte';
  import ActivityPresetInput from './ActivityPresetInput.svelte';

  export let activityDirective: ActivityDirective;
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let activityMetadataDefinitions: ActivityMetadataDefinition[] = [];
  export let activityTypes: ActivityType[] = [];
  export let tags: Tag[] = [];
  export let editable: boolean = true;
  export let highlightKeys: string[] = [];
  export let modelId: number;
  export let planStartTimeYmd: string;
  export let showActivityName: boolean = false;
  export let showHeader: boolean = true;
  export let user: User | null;

  const updatePermissionError = 'You do not have permission to update this activity';

  let editingActivityName: boolean = false;
  let hasUpdatePermission: boolean = false;
  let numOfUserChanges: number = 0;
  let formParameters: FormParameter[] = [];
  let highlightKeysMap: Record<string, boolean> = {};
  let parametersWithErrorsCount: number = 0;
  let parameterErrorMap: Record<string, string[]> = {};
  let startTimeDoy: string;
  let startTimeDoyField: FieldStore<string>;

  $: if (user !== null && $plan !== null) {
    hasUpdatePermission = featurePermissions.activityDirective.canUpdate(user, $plan, activityDirective);
  }
  $: highlightKeysMap = keyByBoolean(highlightKeys);
  $: activityType =
    (activityTypes ?? []).find(({ name: activityTypeName }) => activityDirective?.type === activityTypeName) ?? null;
  $: startTimeDoy = getDoyTimeFromInterval(planStartTimeYmd, activityDirective.start_offset);
  $: startTimeDoyField = field<string>(startTimeDoy, [required, timestamp]);
  $: activityNameField = field<string>(activityDirective.name);

  $: if (activityType && activityDirective.arguments) {
    effects
      .getEffectiveActivityArguments(modelId, activityType.name, activityDirective.arguments, user)
      .then(effectiveArguments => {
        if (effectiveArguments && activityType) {
          const { arguments: defaultArgumentsMap } = effectiveArguments;
          formParameters = getFormParameters(
            activityType.parameters,
            activityDirective.arguments,
            activityType.required_parameters,
            activityDirective.applied_preset?.preset_applied?.arguments,
            defaultArgumentsMap,
          );
        }
      });
  }
  $: validateArguments(activityDirective.arguments);
  $: numOfUserChanges = formParameters.reduce((previousHasChanges: number, formParameter) => {
    return /user/.test(formParameter.valueSource) ? previousHasChanges + 1 : previousHasChanges;
  }, 0);

  $: if (parameterErrorMap) {
    formParameters = formParameters.map((formParameter: FormParameter) => {
      const errors = parameterErrorMap[formParameter.name];
      return { ...formParameter, errors: errors || null };
    });
    parametersWithErrorsCount = Object.keys(parameterErrorMap).length;
  }

  $: getActivityMetadataValue = (key: string) => {
    const metadata = activityDirective.metadata;
    if (metadata) {
      return metadata[key];
    }
  };

  async function applyPresetToActivity(presetId: number | null, numOfUserChanges: number) {
    if (presetId === null && activityDirective.applied_preset) {
      await effects.removePresetFromActivityDirective(
        activityDirective.plan_id,
        activityDirective.id,
        activityDirective.applied_preset.preset_id,
        user,
      );
    } else if (presetId !== null) {
      await effects.applyPresetToActivity(
        presetId,
        activityDirective.id,
        activityDirective.plan_id,
        numOfUserChanges,
        user,
      );
    }
  }

  function editActivityName() {
    editingActivityName = true;
  }
  function updateAnchor({ detail: anchorId }: CustomEvent<ActivityDirectiveId>) {
    const { id, plan_id } = activityDirective;
    effects.updateActivityDirective(plan_id, id, { anchor_id: anchorId }, user);
  }

  function updateAnchorEdge({ detail: isStart }: CustomEvent<boolean>) {
    const { id, plan_id } = activityDirective;
    effects.updateActivityDirective(plan_id, id, { anchored_to_start: isStart }, user);
  }

  function updateStartOffset({ detail: offset }: CustomEvent<string>) {
    const { id, plan_id } = activityDirective;
    effects.updateActivityDirective(plan_id, id, { start_offset: offset }, user);
  }

  async function onActivityNameKeyup(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if ($activityNameField.dirty) {
        resetActivityName();
      }
      editingActivityName = false;
    }
  }

  async function onApplyPresetToActivity(event: CustomEvent<number | null>) {
    const { detail: presetId } = event;
    await applyPresetToActivity(presetId, numOfUserChanges);
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    const { arguments: argumentsMap, id, plan_id } = activityDirective;
    const newArguments = getArguments(argumentsMap, formParameter);
    effects.updateActivityDirective(plan_id, id, { arguments: newArguments }, user);
  }

  function onResetFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    const { arguments: argumentsMap, id, plan_id } = activityDirective;
    const newArguments = getArguments(argumentsMap, {
      ...formParameter,
      value: activityDirective.applied_preset
        ? activityDirective.applied_preset.preset_applied.arguments[formParameter.name]
        : null,
    });
    effects.updateActivityDirective(plan_id, id, { arguments: newArguments }, user);
  }

  function onChangeActivityMetadata(event: CustomEvent<{ key: string; value: any }>) {
    const { detail } = event;
    const { key, value } = detail;
    const { id, metadata, plan_id } = activityDirective;
    const newActivityMetadata = getActivityMetadata(metadata, key, value);
    effects.updateActivityDirective(plan_id, id, { metadata: newActivityMetadata }, user);
  }

  async function onDeletePreset(event: CustomEvent<ActivityPresetId>) {
    const { detail: id } = event;
    if ($plan) {
      await effects.deleteActivityPreset(id, $plan.model.name, user);
    }
  }

  async function onSaveNewPreset(event: CustomEvent<ActivityPresetInsertInput>) {
    const {
      detail: { name },
    } = event;
    const id = await effects.createActivityPreset(
      activityDirective.arguments,
      activityDirective.type,
      name,
      modelId,
      user,
    );
    if (id !== null) {
      await applyPresetToActivity(id, 0);
    }
  }

  async function onSavePreset(event: CustomEvent<ActivityPresetInsertInput>) {
    const { detail } = event;
    const { name } = detail;
    if (activityDirective.applied_preset) {
      await effects.updateActivityPreset(
        activityDirective.applied_preset.preset_id,
        {
          arguments: activityDirective.arguments,
          name,
        },
        user,
      );
    }
  }

  async function onUpdateActivityName() {
    if ($activityNameField.dirty) {
      if ($activityNameField.value) {
        const { id, plan_id } = activityDirective;
        effects.updateActivityDirective(plan_id, id, { name: $activityNameField.value }, user);
      } else {
        resetActivityName();
      }
    }
    editingActivityName = false;
  }

  function onUpdateStartTime() {
    if ($startTimeDoyField.valid && startTimeDoy !== $startTimeDoyField.value) {
      const { id, plan_id } = activityDirective;
      const planStartTimeDoy = getDoyTime(new Date(planStartTimeYmd));
      const start_offset = getIntervalFromDoyRange(planStartTimeDoy, $startTimeDoyField.value);
      effects.updateActivityDirective(plan_id, id, { start_offset }, user);
    }
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      await effects.deleteActivityDirectiveTags([tag.id], user);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      const activityDirectiveTags: ActivityDirectiveTagsInsertInput[] = tagsToAdd.map(({ id: tag_id }) => ({
        directive_id: activityDirective.id,
        plan_id: activityDirective.plan_id,
        tag_id,
      }));
      await effects.createActivityDirectiveTags(activityDirectiveTags, user);
    }
  }

  function resetActivityName() {
    const initialValue = $activityNameField.initialValue;
    activityNameField.reset(initialValue);
    const { id, plan_id } = activityDirective;
    effects.updateActivityDirective(plan_id, id, { name: initialValue }, user);
  }

  async function validateArguments(newArguments: ArgumentsMap | null): Promise<void> {
    if (newArguments) {
      const { type } = activityDirective;
      const { errors, success } = await effects.validateActivityArguments(type, modelId, newArguments, user);

      if (!success && errors) {
        parameterErrorMap = errors.reduce((map: Record<string, string[]>, error) => {
          error.subjects?.forEach(subject => {
            if (!map[subject]) {
              map[subject] = [];
            }
            map[subject].push(error.message);
          });
          return map;
        }, {});
      } else {
        parameterErrorMap = {};
      }
    }
  }
</script>

{#if showHeader}
  <div class="activity-header">
    <div class={classNames('activity-header-title', { 'activity-header-title--editing': editingActivityName })}>
      {#if !editingActivityName}
        <button class="icon st-button activity-header-title-edit-button" on:click={editActivityName}>
          <div class="activity-header-title-value st-typography-medium">
            {$activityNameField.value}
          </div>
          <PenIcon />
        </button>
      {:else}
        <Field field={activityNameField} on:change={onUpdateActivityName}>
          <input
            on:keyup={onActivityNameKeyup}
            autocomplete="off"
            class="st-input w-100"
            name="activity-name"
            placeholder="Enter activity name"
          />
        </Field>
        <button
          use:tooltip={{ content: 'Save', placement: 'top' }}
          class="icon st-button"
          on:click={onUpdateActivityName}
        >
          <CheckIcon />
        </button>
      {/if}
    </div>
  </div>
{/if}

<div class="activity-form">
  <fieldset>
    <Collapse title="Definition">
      {#if showActivityName}
        <Highlight highlight={highlightKeysMap.name}>
          <Input layout="inline">
            <label use:tooltip={{ content: 'Activity Name', placement: 'top' }} for="activityName">
              Activity Name
            </label>
            <input class="st-input w-100" disabled name="activityName" value={activityDirective.name} />
          </Input>
        </Highlight>
      {/if}

      <Highlight highlight={highlightKeysMap.id}>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Activity ID', placement: 'top' }} for="id"> ID</label>
          <input class="st-input w-100" disabled name="id" value={activityDirective.id} />
        </Input>
      </Highlight>

      <Highlight highlight={highlightKeysMap.type}>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Activity Type', placement: 'top' }} for="activity-type">
            Activity Type
          </label>
          <input class="st-input w-100" disabled name="activity-type" value={activityDirective.type} />
        </Input>
      </Highlight>

      <Highlight highlight={highlightKeysMap.start_offset}>
        <DatePickerField
          disabled={!editable || activityDirective.anchor_id !== null}
          field={startTimeDoyField}
          label="Start Time - YYYY-DDDThh:mm:ss"
          layout="inline"
          name="start-time"
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasUpdatePermission,
                permissionError: updatePermissionError,
              },
            ],
          ]}
          on:change={onUpdateStartTime}
          on:keydown={onUpdateStartTime}
        />
      </Highlight>

      <ActivityAnchorForm
        {activityDirective}
        {activityDirectivesMap}
        {hasUpdatePermission}
        anchorId={activityDirective.anchor_id}
        disabled={!editable}
        {highlightKeysMap}
        isAnchoredToStart={activityDirective.anchored_to_start}
        startOffset={activityDirective.start_offset}
        on:updateAnchor={updateAnchor}
        on:updateAnchorEdge={updateAnchorEdge}
        on:updateStartOffset={updateStartOffset}
      />

      <Highlight highlight={highlightKeysMap.created_at}>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Creation Time', placement: 'top' }} for="creationTime"> Creation Time </label>
          <input class="st-input w-100" disabled name="creationTime" value={activityDirective.created_at} />
        </Input>
      </Highlight>

      <Highlight highlight={highlightKeysMap.last_modified_at}>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Last Modified Time', placement: 'top' }} for="lastModifiedTime">
            Last Modified Time
          </label>
          <input class="st-input w-100" disabled name="lastModifiedTime" value={activityDirective.last_modified_at} />
        </Input>
      </Highlight>

      <Highlight highlight={highlightKeysMap.source_scheduling_goal_id}>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Source Scheduling Goal ID', placement: 'top' }} for="sourceSchedulingGoalId">
            Source Scheduling Goal ID
          </label>
          <input
            class="st-input w-100"
            disabled
            name="sourceSchedulingGoalId"
            value={activityDirective.source_scheduling_goal_id ?? 'None'}
          />
        </Input>
      </Highlight>

      <Highlight highlight={highlightKeysMap.tags}>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Tags', placement: 'top' }} for="activityDirectiveTags"> Tags </label>
          <TagsInput
            options={tags}
            selected={activityDirective.tags.map(({ tag }) => tag)}
            use={[
              [
                permissionHandler,
                {
                  hasPermission: hasUpdatePermission,
                  permissionError: updatePermissionError,
                },
              ],
            ]}
            on:change={onTagsInputChange}
          />
        </Input>
      </Highlight>
    </Collapse>
  </fieldset>

  <fieldset>
    <Collapse
      error={parametersWithErrorsCount > 0}
      title={`Parameters${parametersWithErrorsCount > 0 ? ` (${parametersWithErrorsCount} invalid)` : ''}`}
    >
      <div class="activity-preset">
        <ActivityPresetInput
          {modelId}
          {activityDirective}
          disabled={!editable}
          hasChanges={numOfUserChanges > 0}
          {user}
          plan={$plan}
          on:applyPreset={onApplyPresetToActivity}
          on:deletePreset={onDeletePreset}
          on:saveNewPreset={onSaveNewPreset}
          on:savePreset={onSavePreset}
        />
      </div>
      <Parameters
        disabled={!editable}
        {formParameters}
        {highlightKeysMap}
        on:change={onChangeFormParameters}
        on:reset={onResetFormParameters}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasUpdatePermission,
              permissionError: updatePermissionError,
            },
          ],
        ]}
      />
      {#if formParameters.length === 0}
        <div class="st-typography-label">No Parameters Found</div>
      {/if}
    </Collapse>
  </fieldset>

  <fieldset>
    <Collapse title="Annotations">
      {#if activityMetadataDefinitions.length === 0}
        <div class="st-typography-label">No Annotations Found</div>
      {/if}

      {#each activityMetadataDefinitions as definition}
        <Highlight highlight={highlightKeysMap[definition.key]}>
          <ActivityMetadataField
            disabled={!editable}
            on:change={onChangeActivityMetadata}
            value={getActivityMetadataValue(definition.key)}
            {definition}
          />
        </Highlight>
      {/each}
    </Collapse>
  </fieldset>
</div>

<style>
  .activity-form fieldset:last-child {
    padding-bottom: 16px;
  }

  .activity-directive-definition {
    padding: 0.5rem;
  }

  .activity-header {
    align-items: center;
    background: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-15);
    display: flex;
    flex-shrink: 0;
    font-style: italic;
    padding: 4px 8px;
    padding-left: 8px;
  }

  .activity-header-title-placeholder,
  .activity-header-title-value {
    word-break: break-word;
  }

  .activity-header-title-value {
    overflow: hidden;
    padding: 4px 0px;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;
  }

  .activity-header-title-placeholder {
    padding: 4px 8px;
  }

  .activity-header-title {
    align-items: flex-start;
    border-radius: 4px;
    display: flex;
    width: 100%;
  }

  .activity-header-title :global(fieldset) {
    padding: 0;
    width: 100%;
  }

  .activity-header-title-edit-button:hover {
    background-color: var(--st-white);
  }

  .activity-header-title:not(.activity-header-title--editing) .st-button :global(.st-icon) {
    display: none;
    flex-shrink: 0;
  }

  .activity-header-title:not(.activity-header-title--editing) .st-button {
    display: flex;
    gap: 8px;
    height: inherit;
    min-width: 0;
    padding: 0px 8px;
  }

  .activity-header-title:not(.activity-header-title--editing) .st-button:hover {
    background: var(--st-white);
  }

  .activity-header-title:not(.activity-header-title--editing):hover .st-button :global(.st-icon) {
    display: inherit;
  }

  .activity-header-title--editing {
    gap: 8px;
    padding: 0;
    width: 100%;
  }

  .activity-header-title--editing .st-input {
    background-color: var(--st-white);
    font-style: normal;
  }

  .activity-preset {
    margin-left: -7px;
  }

  .annotations {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
