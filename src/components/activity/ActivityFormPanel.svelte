<svelte:options immutable={true} />

<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/svg/check.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/svg/pen.svg?component';
  import { activitiesMap, allPlanTags, selectedActivity } from '../../stores/activities';
  import { activityMetadataDefinitions } from '../../stores/activityMetadata';
  import { filteredExpansionSequences } from '../../stores/expansion';
  import { field } from '../../stores/form';
  import { activityTypesMap, plan } from '../../stores/plan';
  import { simulationDatasetId } from '../../stores/simulation';
  import { getActivityMetadata, getActivityRootParent } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { classNames } from '../../utilities/generic';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import { getDoyTimeFromDuration, getUnixEpochTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { required, timestamp } from '../../utilities/validators';
  import ActivityMetadataField from '../activityMetadata/ActivityMetadataField.svelte';
  import DatePickerField from '../form/DatePickerField.svelte';
  import Field from '../form/Field.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Panel from '../ui/Panel.svelte';
  import Tags from '../ui/Tags.svelte';
  import ActivityDecomposition from './ActivityDecomposition.svelte';

  export let gridId: number;

  // Activity vars.
  let activityName: string | null = null;
  let argumentsMap: ArgumentsMap | null = null;
  let creationTime: string | null = null;
  let duration: string | null = null;
  let id: number | null = null;
  let lastModifiedTime: string | null = null;
  let metadata: ActivityMetadata = {};
  let parent_id: number | null = null;
  let planTags: string[] = [];
  let root_activity: Activity | null = null;
  let seq_id: string | null = null;
  let simulated_activity_id: number | null = null;
  let sourceSchedulingGoalId: number | null = null;
  let startTime: string | null = null;
  let tags: string[] = [];
  let type: string | null = null;
  let unfinished: boolean | null = null;

  // Other vars.
  let editingActivityName: boolean = false;
  let endTime: string | null = null;
  let formParametersComputedAttributes: FormParameter[] = [];
  let formParameters: FormParameter[] = [];
  let isChild: boolean;
  let model: Model;
  let parameterError: string | null = null;
  let rootActivityHasChildren: boolean;
  let startTimeField: FieldStore<string>;

  $: if ($selectedActivity) {
    activityName = $selectedActivity.name;
    argumentsMap = $selectedActivity.arguments;
    creationTime = $selectedActivity.created_at;
    duration = $selectedActivity.duration;
    id = $selectedActivity.id;
    lastModifiedTime = $selectedActivity.last_modified_at;
    metadata = $selectedActivity.metadata;
    parent_id = $selectedActivity.parent_id;
    root_activity = getActivityRootParent($activitiesMap, id);
    simulated_activity_id = $selectedActivity.simulated_activity_id;
    sourceSchedulingGoalId = $selectedActivity.source_scheduling_goal_id;
    startTime = $selectedActivity.start_time;
    tags = $selectedActivity.tags;
    type = $selectedActivity.type;
    unfinished = $selectedActivity.unfinished;
  } else {
    activityName = null;
    argumentsMap = null;
    creationTime = null;
    duration = null;
    editingActivityName = false;
    id = null;
    lastModifiedTime = null;
    metadata = {};
    parent_id = null;
    root_activity = null;
    seq_id = null;
    simulated_activity_id = null;
    sourceSchedulingGoalId = null;
    startTime = null;
    type = null;
    unfinished = null;
    tags = [];
  }

  $: if ($allPlanTags) {
    planTags = $allPlanTags;
  } else {
    planTags = [];
  }

  $: model = $plan.model;

  $: activityType = $activityTypesMap[type] || null;
  $: rootActivityHasChildren = root_activity?.child_ids ? root_activity.child_ids.length > 0 : false;
  $: isChild = parent_id !== null;
  $: startTimeField = field<string>(startTime, [required, timestamp]);
  $: activityNameField = field<string>(activityName);
  $: if (duration) {
    const startTimeISO = new Date(getUnixEpochTime(startTime)).toISOString();
    endTime = `${getDoyTimeFromDuration(startTimeISO, duration)}`;
  } else {
    endTime = null;
  }

  $: if (activityType && argumentsMap) {
    effects
      .getEffectiveActivityArguments(model.id, activityType.name, argumentsMap)
      .then(({ arguments: defaultArgumentsMap }) => {
        formParameters = getFormParameters(
          activityType.parameters,
          argumentsMap,
          activityType.required_parameters,
          defaultArgumentsMap,
        );
      });
  }
  $: validateArguments(argumentsMap);

  $: if (simulated_activity_id !== null && $simulationDatasetId !== null) {
    effects.getExpansionSequenceId(simulated_activity_id, $simulationDatasetId).then(seqId => {
      seq_id = seqId;
    });
  }

  $: getActivityMetadataValue = (key: string) => {
    if (metadata) {
      return metadata[key];
    }
  };

  $: setFormParametersComputedAttributes(
    activityType?.computed_attributes_value_schema,
    $selectedActivity?.attributes?.computedAttributes,
  );

  async function updateExpansionSequenceToActivity() {
    if (seq_id === null) {
      await effects.deleteExpansionSequenceToActivity($simulationDatasetId, simulated_activity_id);
    } else {
      await effects.insertExpansionSequenceToActivity($simulationDatasetId, simulated_activity_id, seq_id);
    }
  }

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    const newArguments = getArguments(argumentsMap, formParameter);
    effects.updateActivityDirective(id, { arguments: newArguments });
  }

  async function onChangeActivityMetadata(event: CustomEvent<{ key: string; value: any }>) {
    const {
      detail: { key, value },
    } = event;
    const newActivityMetadata = getActivityMetadata(metadata, key, value);
    effects.updateActivityDirective(id, { metadata: newActivityMetadata });
  }

  function onUpdateStartTime() {
    if ($startTimeField.valid && startTime !== $startTimeField.value) {
      effects.updateActivityDirective(id, { start_time: $startTimeField.value });
    }
  }

  function onUpdateTags(event: CustomEvent<{ tags: string[] }>) {
    const { detail } = event;
    const { tags } = detail;
    effects.updateActivityDirective(id, { tags });
  }

  function editActivityName() {
    editingActivityName = true;
  }

  function resetActivityName() {
    const initialValue = $activityNameField.initialValue;
    activityNameField.reset(initialValue);
    effects.updateActivityDirective(id, { name: initialValue });
  }

  async function onUpdateActivityName() {
    if ($activityNameField.dirty) {
      if ($activityNameField.value) {
        effects.updateActivityDirective(id, { name: $activityNameField.value });
      } else {
        resetActivityName();
      }
    }
    editingActivityName = false;
  }

  async function onActivityNameKeyup(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if ($activityNameField.dirty) {
        resetActivityName();
      }
      editingActivityName = false;
    }
  }

  /**
   * Transforms computed attributes to conform to ParametersMap and ArgumentsMap
   * so we can render computed attributes as form parameters.
   */
  function setFormParametersComputedAttributes(
    schema: ValueSchema | undefined,
    computedAttributes: ArgumentsMap | undefined,
  ) {
    if (schema) {
      const parametersMap: ParametersMap = { Value: { order: 0, schema } };
      const argumentsMap: ArgumentsMap = computedAttributes ? { Value: computedAttributes } : { Value: {} };
      formParametersComputedAttributes = getFormParameters(parametersMap, argumentsMap, []);
    }
  }

  async function validateArguments(newArguments: ArgumentsMap | null): Promise<void> {
    if (newArguments) {
      const { errors, success } = await effects.validateActivityArguments(type, model.id, newArguments);

      // TODO: Update to account for errors returned for individual arguments.
      if (!success) {
        console.log(errors);
        parameterError = 'one or more invalid - see console';
      } else {
        parameterError = null;
      }
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Selected Activity" />
    <button
      class="st-button icon"
      disabled={isChild || !$selectedActivity}
      on:click|stopPropagation={() => effects.deleteActivityDirective(id)}
      use:tooltip={{ content: 'Delete Activity', placement: 'left' }}
    >
      <i class="bi bi-trash" />
    </button>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedActivity}
      <div class="activity-header">
        {#if activityName}
          <div
            class={classNames('activity-header-title', {
              'activity-header-title--editing': editingActivityName,
            })}
          >
            {#if !editingActivityName}
              <button class="icon st-button activity-header-title-edit-button" on:click={editActivityName}>
                <div class="activity-header-title-value st-typography-medium">
                  {$activityNameField.value}
                </div>
                <PenIcon />
              </button>
            {:else}
              <Field field={activityNameField} on:keydown={onUpdateActivityName} on:blur={onUpdateActivityName}>
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
                on:click={onUpdateActivityName}><CheckIcon /></button
              >
            {/if}
          </div>
        {:else}
          <div class="activity-header-title-placeholder st-typography-medium">{type}</div>
        {/if}
      </div>
      <div class="activity-directive-definition">
        <details open style:cursor="pointer">
          <summary>Definition</summary>
          <fieldset>
            <label for="id">Activity ID</label>
            <input class="st-input w-100" disabled name="id" value={id} />
          </fieldset>

          <fieldset>
            <label for="activity-type">Activity Type</label>
            <input class="st-input w-100" disabled name="activity-type" value={type} />
          </fieldset>

          <fieldset>
            <label for="parent-id">Parent ID</label>
            <input
              class="st-input w-100"
              disabled
              name="parent-id"
              value={isChild ? parent_id : 'None (Root Activity)'}
            />
          </fieldset>

          <fieldset>
            <label for="duration">Duration</label>
            <input class="st-input w-100" disabled name="duration" value={duration ?? 'None'} />
          </fieldset>

          <fieldset>
            <label for="simulationStatus">Simulation Status</label>
            <input
              class="st-input w-100"
              disabled
              name="simulationStatus"
              value={unfinished ? 'Unfinished' : duration ? 'Finished' : 'None'}
            />
          </fieldset>

          <DatePickerField
            disabled={isChild}
            field={startTimeField}
            label="Start Time - YYYY-DDDThh:mm:ss"
            name="start-time"
            on:change={onUpdateStartTime}
            on:keydown={onUpdateStartTime}
          />

          {#if duration !== null}
            <fieldset>
              <label for="endTime">End Time</label>
              <input class="st-input w-100" disabled name="endTime" value={endTime} />
            </fieldset>
          {/if}

          <fieldset>
            <label for="creationTime">Creation Time</label>
            <input class="st-input w-100" disabled name="creationTime" value={creationTime ?? 'None'} />
          </fieldset>

          <fieldset>
            <label for="lastModifiedTime">Last Modified Time</label>
            <input class="st-input w-100" disabled name="lastModifiedTime" value={lastModifiedTime ?? 'None'} />
          </fieldset>

          <fieldset>
            <label for="sourceSchedulingGoalId">Source Scheduling Goal ID</label>
            <input
              class="st-input w-100"
              disabled
              name="sourceSchedulingGoalId"
              value={sourceSchedulingGoalId ?? 'None'}
            />
          </fieldset>

          {#if duration !== null}
            <fieldset>
              <label for="endTime">End Time</label>
              <input class="st-input w-100" disabled name="endTime" value={endTime} />
            </fieldset>
          {/if}

          <fieldset>
            <label for="activityTags">Tags</label>
            <!--
              Make use of svelte's 'key' here and switch on activity ID in order to clear the
              text input in the tags component which would otherwise remain populated with
              dirty input when a user switches to a new activity.
             -->
            {#key id}
              <Tags
                disabled={isChild}
                autocompleteValues={planTags}
                name="activityTags"
                on:change={onUpdateTags}
                {tags}
              />
            {/key}
          </fieldset>
        </details>
      </div>

      <fieldset>
        <details open style:cursor="pointer">
          <summary>Annotations</summary>
          <div class="mt-2 annotations">
            {#if $activityMetadataDefinitions.length === 0 || isChild}
              <div class="p-1">No Annotations Found</div>
            {/if}
            {#if !isChild}
              {#each $activityMetadataDefinitions as definition}
                <ActivityMetadataField
                  on:change={onChangeActivityMetadata}
                  value={getActivityMetadataValue(definition.key)}
                  {definition}
                />
              {/each}
            {/if}
          </div>
        </details>
      </fieldset>

      <fieldset>
        <details open style:cursor="pointer">
          <summary>
            <span class:error={parameterError !== null}>
              Parameters
              {#if parameterError !== null}
                ({parameterError})
              {/if}
            </span>
          </summary>
          <div class="mt-2">
            <Parameters disabled={isChild} {formParameters} on:change={onChangeFormParameters} />
          </div>
        </details>
      </fieldset>

      <fieldset>
        <details open style:cursor="pointer">
          <summary>Computed Attributes</summary>
          <div class="mt-2">
            <Parameters
              disabled={true}
              expanded
              formParameters={formParametersComputedAttributes}
              levelPadding={0}
              showName={false}
            />
          </div>
        </details>
      </fieldset>

      <fieldset>
        <details open={rootActivityHasChildren} style:cursor="pointer">
          <summary>Decomposition</summary>
          <div class="mt-2">
            {#if rootActivityHasChildren}
              <ActivityDecomposition id={root_activity.id} selected_id={id} />
            {:else}
              <div class="p-1">This activity has no children</div>
            {/if}
          </div>
        </details>
      </fieldset>

      <fieldset>
        <details open style:cursor="pointer">
          <summary>Sequencing</summary>

          <div class="mt-2 mb-3">
            <label for="simulationDatasetId">Simulation Dataset ID</label>
            <input class="st-input w-100" disabled name="simulationDatasetId" value={$simulationDatasetId ?? 'None'} />
          </div>

          <div class="mt-2">
            <label for="expansionSet">Sequence ID</label>
            <select
              bind:value={seq_id}
              class="st-select w-100"
              name="sequences"
              disabled={!$filteredExpansionSequences.length}
              on:change={updateExpansionSequenceToActivity}
            >
              {#if !$filteredExpansionSequences.length}
                <option value={null}>No Sequences for Simulation Dataset {$simulationDatasetId ?? ''}</option>
              {:else}
                <option value={null} />
                {#each $filteredExpansionSequences as sequence}
                  <option value={sequence.seq_id}>
                    {sequence.seq_id}
                  </option>
                {/each}
              {/if}
            </select>
          </div>
        </details>
      </fieldset>
    {:else}
      <div class="p-2">No Activity Selected</div>
    {/if}
  </svelte:fragment>
</Panel>

<style>
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

  .annotations {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
