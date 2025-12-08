<svelte:options immutable={true} />

<script lang="ts">
  import DirectiveIcon from '../../../../assets/timeline-directive.svg?component';
  import SpanIcon from '../../../../assets/timeline-span.svg?component';
  import { activityArgumentDefaultsMap, activityDirectivesMap } from '../../../../stores/activities';
  import { planModelActivityTypes, subsystemTags } from '../../../../stores/plan';
  import { spans, spanUtilityMaps } from '../../../../stores/simulation';
  import { tags } from '../../../../stores/tags';
  import type { ValueSchemaVariant } from '../../../../types/schema';
  import type { ActivityLayerFilter, ActivityLayerFilterSubfieldSchema } from '../../../../types/timeline';
  import { compare } from '../../../../utilities/generic';
  import {
    applyActivityLayerFilter,
    getMatchingTypesForActivityLayerFilter,
  } from '../../../../utilities/timeline';
  import FilterBuilder from './FilterBuilder.svelte';

  export let filter: ActivityLayerFilter | undefined = undefined;
  export const filterWidth = 1000;
  export const filterHeight = 500;
  export let layerName: string = '';

  let filterBuilder: FilterBuilder;
  let parameterSubfields: ActivityLayerFilterSubfieldSchema[] = [];
  let instanceCount: number = 0;

  export function setActiveFilter(newFilter: ActivityLayerFilter) {
    filterBuilder?.setActiveFilter(newFilter);
  }

  export function toggle() {
    filterBuilder?.toggle();
  }

  export function show() {
    filterBuilder?.show();
  }

  export function hide() {
    filterBuilder?.hide();
  }

  $: activityDirectives = Object.values($activityDirectivesMap || {});

  $: dirtyFilter = filter ? structuredClone(filter) : {
    dynamic_type_filters: [],
    other_filters: [],
    static_types: [],
    type_subfilters: {},
  };

  $: appliedFilter = applyActivityLayerFilter(
    dirtyFilter,
    activityDirectives,
    $spans || [],
    $planModelActivityTypes,
    $activityArgumentDefaultsMap,
  );

  $: if (appliedFilter) {
    const seenSpans: Record<number, boolean> = {};
    let count = appliedFilter.directives.length;
    appliedFilter.directives.forEach(directive => {
      const matchingSpanId = $spanUtilityMaps.directiveIdToSpanIdMap[directive.id];
      if (typeof matchingSpanId === 'number') {
        seenSpans[matchingSpanId] = true;
      }
    });
    appliedFilter.spans.forEach(span => {
      if (!seenSpans[span.span_id]) {
        count++;
      }
    });
    instanceCount = count;
  }

  $: matchingTypes = getMatchingTypesForActivityLayerFilter(dirtyFilter, $planModelActivityTypes);

  // Build parameter subfields schema
  $: {
    const allParameterTypes = (matchingTypes.length ? matchingTypes : $planModelActivityTypes).reduce(
      (acc: Record<string, ActivityLayerFilterSubfieldSchema>, activityType) => {
        Object.entries(activityType.parameters).forEach(([parameterName, parameter]) => {
          const parameterType = parameter.schema.type;
          if (parameterType === 'series' || parameterType === 'struct') {
            return;
          }
          const key = `${parameterName} (${parameterType})`;
          const matchingName = !!acc[key];
          const matchingEntry = matchingName && acc[key].type === parameterType;
          const isVariant = parameterType === 'variant';
          let values = null;
          if (matchingEntry) {
            acc[key].activityTypes.push(activityType.name);
            if (isVariant) {
              const variantValues = (parameter.schema as ValueSchemaVariant).variants.map(variant => variant.key);
              values = Array.from(new Set([...variantValues, ...(acc[key].values || [])]));
              acc[key].values = values;
            }
          }
          if (!matchingEntry) {
            const values = isVariant
              ? (parameter.schema as ValueSchemaVariant).variants.map(variant => variant.key)
              : null;
            const unit = parameter.schema.metadata?.unit?.value ?? null;
            acc[key] = {
              activityTypes: [activityType.name],
              name: parameterName,
              type: parameterType,
              ...(values ? { values } : null),
              ...(unit ? { unit } : null),
              label: `${parameterName} (${parameterType})`,
            };
          }
        });
        return acc;
      },
      {},
    );
    parameterSubfields = Object.values(allParameterTypes).sort((a, b) => compare(a.label, b.label));
  }

  // Schema for dynamic type filters
  $: dynamicTypeFilterSchema = {
    Subsystem: {
      does_not_include: { type: 'tag', values: $subsystemTags },
      includes: { type: 'tag', values: $subsystemTags },
    },
    Type: {
      does_not_equal: { type: 'variant', values: $planModelActivityTypes.map(type => type.name) },
      does_not_include: { type: 'string' },
      equals: { type: 'variant', values: $planModelActivityTypes.map(type => type.name) },
      includes: { type: 'string' },
    },
  };

  // Schema for other filters
  $: otherFilterSchema = {
    Name: {
      does_not_equal: { type: 'string' },
      does_not_include: { type: 'string' },
      equals: { type: 'string' },
      includes: { type: 'string' },
    },
    Parameter: {
      subfields: parameterSubfields,
    },
    SchedulingGoalId: {
      does_not_equal: { type: 'int' },
      equals: { type: 'int' },
    },
    Tags: {
      does_not_include: { type: 'tag', values: $tags },
      includes: { type: 'tag', values: $tags },
    },
  };

  // Schema for type subfilters (filters on individual result types)
  $: typeSubfilterSchema = {
    Name: {
      does_not_equal: { type: 'string' },
      does_not_include: { type: 'string' },
      equals: { type: 'string' },
      includes: { type: 'string' },
    },
    Parameter: {
      subfields: parameterSubfields,
    },
    SchedulingGoalId: {
      does_not_equal: { type: 'int' },
      equals: { type: 'int' },
    },
    Tags: {
      does_not_include: { type: 'tag', values: $tags },
      includes: { type: 'tag', values: $tags },
    },
  };

  function handleFilterChange(event: CustomEvent<{ filter: ActivityLayerFilter }>) {
    dirtyFilter = event.detail.filter;
  }
</script>

<FilterBuilder
  bind:this={filterBuilder}
  mode="activity"
  title="Activity Filtering"
  {filter}
  {layerName}
  allTypes={$planModelActivityTypes}
  {matchingTypes}
  {instanceCount}
  TypeIcon={DirectiveIcon}
  InstanceIcon={SpanIcon}
  {dynamicTypeFilterSchema}
  {otherFilterSchema}
  {typeSubfilterSchema}
  dynamicTypeFilterHint="Type includes..."
  otherFilterHint="Tags, parameter, scheduling goal, etc..."
  noItemsMessage="No activities matching your filter"
  defaultDynamicTypeField="Type"
  defaultOtherFilterField="Tags"
  on:filterChange
  on:filterChange={handleFilterChange}
  on:rename
  on:visibilityChange
>
  <slot name="trigger" slot="trigger" />
  <slot name="footer" slot="footer" />
</FilterBuilder>
