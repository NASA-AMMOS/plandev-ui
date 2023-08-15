<svelte:options immutable={true} />

<script lang="ts">
  import type { ActivityType } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { ExpansionSequence } from '../../types/expansion';
  import type { ArgumentsMap, FormParameter, ParametersMap } from '../../types/parameter';
  import type { ValueSchema } from '../../types/schema';
  import type { Span, SpanUtilityMaps, SpansMap } from '../../types/simulation';
  import { getSpanRootParent } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { getFormParameters } from '../../utilities/parameters';
  import { getDoyTimeFromInterval, getUnixEpochTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import Input from '../form/Input.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import ActivityDecomposition from './ActivityDecomposition.svelte';

  export let activityTypes: ActivityType[] = [];
  export let filteredExpansionSequences: ExpansionSequence[] = [];
  export let modelId: number;
  export let planStartTimeYmd: string;
  export let simulationDatasetId: number = -1;
  export let span: Span;
  export let spansMap: SpansMap = {};
  export let spanUtilityMaps: SpanUtilityMaps;
  export let user: User | null;

  let endTimeDoy: string | null = null;
  let formParametersComputedAttributes: FormParameter[] = [];
  let formParameters: FormParameter[] = [];
  let hasComputedAttributes: boolean = false;
  let parametersWithErrorsCount: number = 0;
  let parameterErrorMap: Record<string, string[]> = {};
  let rootSpan: Span | null;
  let rootSpanHasChildren: boolean;
  let seqId: string | null;
  let startTimeDoy: string;

  $: activityType = (activityTypes ?? []).find(({ name: activityTypeName }) => span.type === activityTypeName) ?? null;
  $: rootSpan = getSpanRootParent(spansMap, span.id);
  $: rootSpanHasChildren = (rootSpan && spanUtilityMaps.spanIdToChildIdsMap[rootSpan.id]?.length > 0) ?? false;
  $: startTimeDoy = getDoyTimeFromInterval(planStartTimeYmd, span.start_offset);

  $: if (span.duration) {
    const startTimeISO = new Date(getUnixEpochTime(startTimeDoy)).toISOString();
    endTimeDoy = getDoyTimeFromInterval(startTimeISO, span.duration);
  } else {
    endTimeDoy = null;
  }

  $: if (activityType && span.attributes.arguments) {
    effects
      .getEffectiveActivityArguments(modelId, activityType.name, span.attributes.arguments, user)
      .then(activityArguments => {
        if (activityArguments !== null && activityType !== null) {
          formParameters = getFormParameters(
            activityType.parameters,
            span.attributes.arguments,
            activityType.required_parameters,
            activityArguments.arguments,
          );
        }
      });
  }

  $: if (parameterErrorMap) {
    formParameters = formParameters.map((formParameter: FormParameter) => {
      const errors = parameterErrorMap[formParameter.name];
      return { ...formParameter, errors: errors || null };
    });
    parametersWithErrorsCount = Object.keys(parameterErrorMap).length;
  }

  $: if (simulationDatasetId !== null) {
    effects.getExpansionSequenceId(span.id, simulationDatasetId, user).then(newSeqId => (seqId = newSeqId));
  }

  $: setFormParametersComputedAttributes(
    activityType?.computed_attributes_value_schema,
    span?.attributes?.computedAttributes,
  );

  // Check to see if the span has a single empty computed value
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
    if (seqId === null) {
      await effects.deleteExpansionSequenceToActivity(simulationDatasetId, span.id, user);
    } else {
      await effects.insertExpansionSequenceToActivity(simulationDatasetId, span.id, seqId, user);
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
      formParametersComputedAttributes = getFormParameters(parametersMap, argumentsMap, []).map(formParameter => ({
        ...formParameter,
        valueSource: 'none',
      }));
    }
  }
</script>

<div class="activity-span-form">
  <fieldset>
    <Collapse title="Definition">
      <Input layout="inline">
        <label use:tooltip={{ content: 'ID', placement: 'top' }} for="id"> ID </label>
        <input class="st-input w-100" disabled name="id" value={span.id} />
      </Input>

      <Input layout="inline">
        <label use:tooltip={{ content: 'Activity Type', placement: 'top' }} for="activityType"> Activity Type </label>
        <input class="st-input w-100" disabled name="activityType" value={span.type} />
      </Input>

      <Input layout="inline">
        <label use:tooltip={{ content: 'Parent ID', placement: 'top' }} for="parentId">Parent ID</label>
        <input class="st-input w-100" disabled name="parentId" value={span.parent_id ?? 'None (Root)'} />
      </Input>

      <Input layout="inline">
        <label use:tooltip={{ content: 'Duration', placement: 'top' }} for="duration">Duration</label>
        <input class="st-input w-100" disabled name="duration" value={span.duration ?? 'None'} />
      </Input>

      <Input layout="inline">
        <label use:tooltip={{ content: 'Simulation Status', placement: 'top' }} for="simulationStatus">
          Simulation Status
        </label>
        <input
          class="st-input w-100"
          disabled
          name="simulationStatus"
          value={span.duration === null ? 'Unfinished' : span.duration ? 'Finished' : 'None'}
        />
      </Input>

      <Input layout="inline">
        <label use:tooltip={{ content: 'Start Time', placement: 'top' }} for="startTime">Start Time</label>
        <input class="st-input w-100" disabled name="startTime" value={startTimeDoy} />
      </Input>

      <Input layout="inline">
        <label use:tooltip={{ content: 'End Time', placement: 'top' }} for="endTime">End Time</label>
        <input class="st-input w-100" disabled name="endTime" value={endTimeDoy ?? 'None'} />
      </Input>
    </Collapse>
  </fieldset>

  <fieldset>
    <Collapse
      error={parametersWithErrorsCount > 0}
      title={`Parameters${parametersWithErrorsCount > 0 ? ` (${parametersWithErrorsCount} invalid)` : ''}`}
    >
      <Parameters disabled {formParameters} hideRightAdornments={true} />
      {#if formParameters.length === 0}
        <div class="st-typography-label">No Parameters Found</div>
      {/if}
    </Collapse>
  </fieldset>

  <fieldset>
    <Collapse title="Computed Attributes">
      {#if !hasComputedAttributes}
        <div class="st-typography-label">No Computed Attributes Found</div>
      {:else}
        <Parameters disabled expanded formParameters={formParametersComputedAttributes} />
      {/if}
    </Collapse>
  </fieldset>

  <fieldset>
    <Collapse title="Decomposition" defaultExpanded={rootSpanHasChildren}>
      {#if rootSpanHasChildren}
        <ActivityDecomposition
          rootSpanId={rootSpan?.id}
          selectedSpanId={span.id}
          {spanUtilityMaps}
          {spansMap}
          on:select
        />
      {:else}
        <div class="st-typography-label">This activity has no children</div>
      {/if}
    </Collapse>
  </fieldset>

  <fieldset>
    <Collapse title="Sequencing">
      <Input layout="inline">
        <label use:tooltip={{ content: 'Simulation Dataset ID', placement: 'top' }} for="simulationDatasetId">
          Simulation Dataset ID
        </label>
        <input class="st-input w-100" disabled name="simulationDatasetId" value={simulationDatasetId ?? 'None'} />
      </Input>

      <Input layout="inline">
        <label use:tooltip={{ content: 'Sequence ID', placement: 'top' }} for="expansionSet">Sequence ID</label>
        <select
          bind:value={seqId}
          class="st-select w-100"
          name="sequences"
          disabled={!filteredExpansionSequences.length}
          on:change={updateExpansionSequenceToActivity}
        >
          {#if !filteredExpansionSequences.length}
            <option value={null}>No Sequences for Simulation Dataset {simulationDatasetId ?? ''}</option>
          {:else}
            <option value={null} />
            {#each filteredExpansionSequences as sequence}
              <option value={sequence.seq_id}>
                {sequence.seq_id}
              </option>
            {/each}
          {/if}
        </select>
      </Input>
    </Collapse>
  </fieldset>
</div>

<style>
  .activity-span-form fieldset:last-child {
    padding-bottom: 16px;
  }
</style>
