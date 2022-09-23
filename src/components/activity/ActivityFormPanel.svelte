<svelte:options immutable={true} />

<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import {
    activitiesMap,
    activityMetadataDefinitions,
    allActivityTags,
    selectedActivity,
  } from '../../stores/activities';
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
  import Input from '../form/Input.svelte';
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
  let hasComputedAttributes: boolean = false;
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
  let parametersWithErrorsCount: number = 0;
  let parameterErrorMap: Record<string, string[]> = {};
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
    hasComputedAttributes = false;
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
    parametersWithErrorsCount = 0;
    parameterErrorMap = {};
  }

  $: if ($allActivityTags) {
    planTags = $allActivityTags;
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

  $: if (parameterErrorMap) {
    formParameters = formParameters.map((formParameter: FormParameter) => {
      const errors = parameterErrorMap[formParameter.name];
      return { ...formParameter, errors: errors || null };
    });
    parametersWithErrorsCount = Object.keys(parameterErrorMap).length;
  }

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

  // Check to see if the activity has a single empty computed value
  // which is the same as having no computed attributes
  $: if (formParametersComputedAttributes) {
    if (formParametersComputedAttributes.length > 0) {
      if (
        formParametersComputedAttributes.length === 1 &&
        formParametersComputedAttributes[0].schema.type === 'struct' &&
        Object.keys(formParametersComputedAttributes[0].schema.items).length === 0
      ) {
        hasComputedAttributes = false;
      } else {
        hasComputedAttributes = true;
      }
    } else {
      hasComputedAttributes = false;
    }
  }

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

      if (!success) {
        parameterErrorMap = errors.reduce((map, error) => {
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

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Selected Activity" />
    <button
      class="st-button icon activity-header-delete"
      disabled={isChild || !$selectedActivity}
      on:click|stopPropagation={() => effects.deleteActivityDirective(id)}
      use:tooltip={{ content: 'Delete Activity', placement: 'top' }}
    >
      <TrashIcon />
    </button>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedActivity}
      <div class="activity-header">
        {#if activityName}
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
                on:click={onUpdateActivityName}><CheckIcon /></button
              >
            {/if}
          </div>
        {:else}
          <div class="activity-header-title-placeholder st-typography-medium">{type}</div>
        {/if}
      </div>

      <div class="activity-form">
        <fieldset>
          <details open>
            <summary>Definition</summary>

            <div class="details-body">
              <Input layout="inline">
                <label use:tooltip={{ content: 'Activity ID', placement: 'top' }} for="id"> Activity ID</label>
                <input class="st-input w-100" disabled name="id" value={id} />
              </Input>

              <Input layout="inline">
                <label use:tooltip={{ content: 'Activity Type', placement: 'top' }} for="activity-type">
                  Activity Type
                </label>
                <input class="st-input w-100" disabled name="activity-type" value={type} />
              </Input>

              <Input layout="inline">
                <label use:tooltip={{ content: 'Parent ID', placement: 'top' }} for="parent-id">Parent ID</label>
                <input
                  class="st-input w-100"
                  disabled
                  name="parent-id"
                  value={isChild ? parent_id : 'None (Root Activity)'}
                />
              </Input>

              <Input layout="inline">
                <label use:tooltip={{ content: 'Duration', placement: 'top' }} for="duration">Duration</label>
                <input class="st-input w-100" disabled name="duration" value={duration ?? 'None'} />
              </Input>

              <Input layout="inline">
                <label use:tooltip={{ content: 'Simulation Status', placement: 'top' }} for="simulationStatus">
                  Simulation Status
                </label>
                <input
                  class="st-input w-100"
                  disabled
                  name="simulationStatus"
                  value={unfinished ? 'Unfinished' : duration ? 'Finished' : 'None'}
                />
              </Input>

              <DatePickerField
                disabled={isChild}
                field={startTimeField}
                label="Start Time - YYYY-DDDThh:mm:ss"
                layout="inline"
                name="start-time"
                on:change={onUpdateStartTime}
                on:keydown={onUpdateStartTime}
              />

              {#if duration !== null}
                <Input layout="inline">
                  <label use:tooltip={{ content: 'End Time', placement: 'top' }} for="endTime">End Time</label>
                  <input class="st-input w-100" disabled name="endTime" value={endTime} />
                </Input>
              {/if}

              <Input layout="inline">
                <label use:tooltip={{ content: 'Creation Time', placement: 'top' }} for="creationTime">
                  Creation Time
                </label>
                <input class="st-input w-100" disabled name="creationTime" value={creationTime ?? 'None'} />
              </Input>

              <Input layout="inline">
                <label use:tooltip={{ content: 'Last Modified Time', placement: 'top' }} for="lastModifiedTime">
                  Last Modified Time
                </label>
                <input class="st-input w-100" disabled name="lastModifiedTime" value={lastModifiedTime ?? 'None'} />
              </Input>

              <Input layout="inline">
                <label
                  use:tooltip={{ content: 'Source Scheduling Goal ID', placement: 'top' }}
                  for="sourceSchedulingGoalId"
                >
                  Source Scheduling Goal ID
                </label>
                <input
                  class="st-input w-100"
                  disabled
                  name="sourceSchedulingGoalId"
                  value={sourceSchedulingGoalId ?? 'None'}
                />
              </Input>

              {#if duration !== null}
                <Input layout="inline">
                  <label use:tooltip={{ content: 'End Time', placement: 'top' }} for="endTime">End Time</label>
                  <input class="st-input w-100" disabled name="endTime" value={endTime} />
                </Input>
              {/if}

              <Input layout="inline">
                <label use:tooltip={{ content: 'Tags', placement: 'top' }} for="activityTags">Tags</label>
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
              </Input>
            </div>
          </details>
        </fieldset>

        <fieldset>
          <details open>
            <summary>Annotations</summary>
            <div class="details-body">
              {#if $activityMetadataDefinitions.length === 0 || isChild}
                <div class="st-typography-label">No Annotations Found</div>
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
          <details open>
            <summary>
              <span class:error={parametersWithErrorsCount > 0}>
                Parameters
                {#if parametersWithErrorsCount > 0}
                  ({parametersWithErrorsCount} invalid)
                {/if}
              </span>
            </summary>
            <div class="details-body">
              <Parameters disabled={isChild} {formParameters} on:change={onChangeFormParameters} />
              {#if formParameters.length === 0}
                <div class="st-typography-label">No Parameters Found</div>
              {/if}
            </div>
          </details>
        </fieldset>

        <fieldset>
          <details open>
            <summary>Computed Attributes</summary>
            <div class="details-body">
              {#if !hasComputedAttributes}
                <div class="st-typography-label">No Computed Attributes Found</div>
              {:else}
                <Parameters
                  disabled={true}
                  expanded
                  formParameters={formParametersComputedAttributes}
                  levelPadding={0}
                  showName={false}
                />
              {/if}
            </div>
          </details>
        </fieldset>

        <fieldset>
          <details open={rootActivityHasChildren} style:cursor="pointer">
            <summary>Decomposition</summary>
            <div class="details-body">
              {#if rootActivityHasChildren}
                <ActivityDecomposition id={root_activity.id} selected_id={id} />
              {:else}
                <div class="st-typography-label">This activity has no children</div>
              {/if}
            </div>
          </details>
        </fieldset>

        <fieldset>
          <details open>
            <summary>Sequencing</summary>

            <div class="details-body">
              <Input layout="inline">
                <label use:tooltip={{ content: 'Simulation Dataset ID', placement: 'top' }} for="simulationDatasetId">
                  Simulation Dataset ID
                </label>
                <input
                  class="st-input w-100"
                  disabled
                  name="simulationDatasetId"
                  value={$simulationDatasetId ?? 'None'}
                />
              </Input>

              <Input layout="inline">
                <label use:tooltip={{ content: 'Sequence ID', placement: 'top' }} for="expansionSet">Sequence ID</label>
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
              </Input>
            </div>
          </details>
        </fieldset>
      </div>
    {:else}
      <div class="p-2 st-typography-label">No Activity Selected</div>
    {/if}
  </svelte:fragment>
</Panel>

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

  .activity-header-delete {
    border: 1px solid var(--st-gray-30);
  }

  .annotations {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
