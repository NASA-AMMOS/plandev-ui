<svelte:options immutable={true} />

<script lang="ts">
  import { selectedActivity } from '../../stores/activities';
  import { sequences } from '../../stores/expansion';
  import { field } from '../../stores/form';
  import { activityTypesMap, plan } from '../../stores/plan';
  import { simulation } from '../../stores/simulation';
  import effects from '../../utilities/effects';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
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
  let child_ids: number[] | null = null;
  let duration: string | null = null;
  let id: number | null = null;
  let parent_id: number | null = null;
  let seq_id: string | null = null;
  let simulated_activity_id: number | null = null;
  let simulation_dataset_id: number | null = null;
  let startTime: string | null = null;
  let type: string | null = null;

  // Other vars.
  let model: Model;
  let formParameters: FormParameter[] = [];
  let filteredSequences: Sequence[] = [];
  let hasChildren: boolean;
  let isChild: boolean;
  let parameterError: string | null = null;
  let startTimeField: FieldStore<string>;

  $: if ($selectedActivity) {
    argumentsMap = $selectedActivity.arguments;
    child_ids = $selectedActivity.child_ids;
    duration = $selectedActivity.duration;
    id = $selectedActivity.id;
    parent_id = $selectedActivity.parent_id;
    simulated_activity_id = $selectedActivity.simulated_activity_id;
    startTime = $selectedActivity.start_time;
    type = $selectedActivity.type;
  } else {
    argumentsMap = null;
    child_ids = null;
    duration = null;
    id = null;
    parent_id = null;
    seq_id = null;
    simulated_activity_id = null;
    startTime = null;
    type = null;
  }

  $: model = $plan.model;
  $: activityType = $activityTypesMap[type] || null;
  $: hasChildren = child_ids ? child_ids.length > 0 : false;
  $: isChild = parent_id !== null;
  $: startTimeField = field<string>(startTime, [required, timestamp]);
  $: simulation_dataset_id = $simulation.datasets.length
    ? $simulation.datasets[0].id
    : $selectedActivity?.simulation_dataset_id ?? null;
  $: filteredSequences = $sequences.filter(sequence => sequence.simulation_dataset_id === simulation_dataset_id);

  $: if (activityType && argumentsMap) {
    effects
      .getEffectiveActivityArguments(model.id, activityType.name, argumentsMap)
      .then(({ arguments: defaultArgumentsMap }) => {
        formParameters = getFormParameters(activityType.parameters, argumentsMap, defaultArgumentsMap);
      });
  }
  $: validateArguments(argumentsMap);

  $: if (simulated_activity_id !== null && simulation_dataset_id !== null) {
    effects.getSequenceId(simulated_activity_id, simulation_dataset_id).then(seqId => {
      seq_id = seqId;
    });
  }

  async function updateSequenceToActivity() {
    if (seq_id === null) {
      await effects.deleteSequenceToActivity(simulation_dataset_id, simulated_activity_id);
    } else {
      await effects.insertSequenceToActivity(simulation_dataset_id, simulated_activity_id, seq_id);
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
        <input class="st-input w-100" disabled name="duration" value={duration ?? 'None (Run Simulation First)'} />
      </fieldset>

      <Field field={startTimeField} on:valid={onUpdateStartTime}>
        <label for="start-time" slot="label">Start Time</label>
        <input autocomplete="off" class="st-input w-100" disabled={isChild} name="start-time" />
      </Field>

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
        <details open={hasChildren} style:cursor="pointer">
          <summary>Decomposition</summary>
          <div class="mt-2">
            {#if hasChildren}
              <ActivityDecomposition {child_ids} {type} />
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
            <label for="simulationDatasetId">Latest Simulation Dataset ID</label>
            <input class="st-input w-100" disabled name="simulationDatasetId" value={simulation_dataset_id ?? 'None'} />
          </div>

          <div class="mt-2">
            <label for="expansionSet">Sequence ID</label>
            <select
              bind:value={seq_id}
              class="st-select w-100"
              name="sequences"
              disabled={!filteredSequences.length}
              on:change={updateSequenceToActivity}
            >
              {#if !filteredSequences.length}
                <option value={null}>No Sequences for Simulation Dataset</option>
              {:else}
                <option value={null} />
                {#each filteredSequences as sequence}
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
