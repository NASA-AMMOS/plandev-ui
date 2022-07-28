<svelte:options immutable={true} />

<script lang="ts">
  import { activitiesMap, selectedActivity } from '../../stores/activities';
  import { filteredSequences } from '../../stores/expansion';
  import { field } from '../../stores/form';
  import { activityTypesMap, plan } from '../../stores/plan';
  import { simulationDatasetId } from '../../stores/simulation';
  import { getActivityRootParent } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import { getDoyTimeFromDuration, getUnixEpochTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { required, timestamp } from '../../utilities/validators';
  import Field from '../form/Field.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Panel from '../ui/Panel.svelte';
  import ActivityDecomposition from './ActivityDecomposition.svelte';

  export let gridId: number;

  // Activity vars.
  let argumentsMap: ArgumentsMap | null = null;
  let duration: string | null = null;
  let id: number | null = null;
  let parent_id: number | null = null;
  let root_activity: Activity | null = null;
  let seq_id: string | null = null;
  let simulated_activity_id: number | null = null;
  let startTime: string | null = null;
  let type: string | null = null;
  let unfinished: boolean | null = null;

  // Other vars.
  let model: Model;
  let formParametersComputedAttributes: FormParameter[] = [];
  let formParameters: FormParameter[] = [];
  let rootActivityHasChildren: boolean;
  let isChild: boolean;
  let parameterError: string | null = null;
  let startTimeField: FieldStore<string>;
  let endTime: string | null = null;

  $: if ($selectedActivity) {
    argumentsMap = $selectedActivity.arguments;
    duration = $selectedActivity.duration;
    id = $selectedActivity.id;
    parent_id = $selectedActivity.parent_id;
    root_activity = getActivityRootParent($activitiesMap, id);
    simulated_activity_id = $selectedActivity.simulated_activity_id;
    startTime = $selectedActivity.start_time;
    type = $selectedActivity.type;
    unfinished = $selectedActivity.unfinished;
  } else {
    argumentsMap = null;
    duration = null;
    id = null;
    parent_id = null;
    root_activity = null;
    seq_id = null;
    simulated_activity_id = null;
    startTime = null;
    type = null;
    unfinished = null;
  }

  $: model = $plan.model;
  $: activityType = $activityTypesMap[type] || null;
  $: rootActivityHasChildren = root_activity?.child_ids ? root_activity.child_ids.length > 0 : false;
  $: isChild = parent_id !== null;
  $: startTimeField = field<string>(startTime, [required, timestamp]);
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
    effects.getSequenceId(simulated_activity_id, $simulationDatasetId).then(seqId => {
      seq_id = seqId;
    });
  }

  $: setFormParametersComputedAttributes(
    activityType?.computed_attributes_value_schema,
    $selectedActivity?.attributes?.computedAttributes,
  );

  async function updateSequenceToActivity() {
    if (seq_id === null) {
      await effects.deleteSequenceToActivity($simulationDatasetId, simulated_activity_id);
    } else {
      await effects.insertSequenceToActivity($simulationDatasetId, simulated_activity_id, seq_id);
    }
  }

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    const newArguments = getArguments(argumentsMap, formParameter);
    effects.updateActivity(id, { arguments: newArguments });
  }

  function onUpdateStartTime() {
    if ($startTimeField.valid && startTime !== $startTimeField.value) {
      effects.updateActivity(id, { start_time: $startTimeField.value });
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
      on:click|stopPropagation={() => effects.deleteActivity(id)}
      use:tooltip={{ content: 'Delete Activity', placement: 'left' }}
    >
      <i class="bi bi-trash" />
    </button>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedActivity}
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
        <input class="st-input w-100" disabled name="parent-id" value={isChild ? parent_id : 'None (Root Activity)'} />
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

      <Field field={startTimeField} on:blur={onUpdateStartTime} on:keydown={onUpdateStartTime}>
        <label for="start-time" slot="label">Start Time - YYYY-DDDThh:mm:ss</label>
        <input autocomplete="off" class="st-input w-100" disabled={isChild} name="start-time" />
      </Field>

      {#if duration !== null}
        <fieldset>
          <label for="endTime">End Time</label>
          <input class="st-input w-100" disabled name="endTime" value={endTime} />
        </fieldset>
      {/if}

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
              disabled={!$filteredSequences.length}
              on:change={updateSequenceToActivity}
            >
              {#if !$filteredSequences.length}
                <option value={null}>No Sequences for Simulation Dataset {$simulationDatasetId ?? ''}</option>
              {:else}
                <option value={null} />
                {#each $filteredSequences as sequence}
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
