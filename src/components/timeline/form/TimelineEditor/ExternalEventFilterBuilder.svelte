<svelte:options immutable={true} />

<script lang="ts">
  import TagIcon from '@nasa-jpl/stellar/icons/tag.svg?component';
  import ExternalEventIcon from '../../../../assets/external-event-box-with-arrow.svg?component';
  import { externalEventsMap, externalEventTypes } from '../../../../stores/external-event';
  import type { ExternalEventType } from '../../../../types/external-event';
  import type { ExternalEventLayerFilter, ExternalEventLayerFilterSubfieldSchema } from '../../../../types/timeline';
  import { compare } from '../../../../utilities/generic';
  import {
    applyExternalEventLayerFilter,
    getMatchingTypesForExternalEventLayerFilter,
  } from '../../../../utilities/timeline';
  import FilterBuilder from './FilterBuilder.svelte';

  export let filter: ExternalEventLayerFilter | undefined;
  export const filterWidth = 1000;
  export const filterHeight = 500;
  export let layerName: string = '';

  let filterBuilder: FilterBuilder;
  let parameterSubfields: ExternalEventLayerFilterSubfieldSchema[] = [];
  let instanceCount: number = 0;

  export function toggle() {
    filterBuilder?.toggle();
  }

  export function show() {
    filterBuilder?.show();
  }

  export function hide() {
    filterBuilder?.hide();
  }

  $: dirtyFilter = filter
    ? structuredClone(filter)
    : {
        dynamic_type_filters: [],
        other_filters: [],
        static_types: [],
        type_subfilters: {},
      };

  $: externalEvents = Object.values($externalEventsMap || {});
  $: appliedFilter = applyExternalEventLayerFilter(dirtyFilter, externalEvents);

  $: if (appliedFilter) {
    instanceCount = appliedFilter.externalEvents.length;
  }

  $: matchingTypes = getMatchingTypesForExternalEventLayerFilter(dirtyFilter, $externalEventTypes);

  // Build parameter subfields schema
  $: {
    const allParameterTypes = (matchingTypes.length ? matchingTypes : $externalEventTypes).reduce(
      (acc: Record<string, ExternalEventLayerFilterSubfieldSchema>, externalEventType) => {
        Object.entries(externalEventType.attribute_schema.properties).forEach(
          ([parameterName, parameterDefinition]) => {
            const casted: any = parameterDefinition as any;
            let parameterType = casted.type;
            if (parameterType === 'series' || parameterType === 'struct') {
              return;
            }
            if (parameterType === undefined && !!casted.enum) {
              parameterType = 'enum';
            }
            const key = `${parameterName} (${parameterType})`;
            const matchingName = !!acc[key];
            const matchingEntry = matchingName && acc[key].type === parameterType;
            if (matchingEntry) {
              acc[key].externalEventTypes.push(externalEventType.name);
              switch (parameterType) {
                case 'enum':
                  handleEnumAttribute(acc, parameterName, parameterDefinition, externalEventType);
                  break;
                case 'object':
                  recurseObjectAttributeProperties(acc, casted.properties, parameterName, externalEventType);
                  break;
                default:
                  acc[key].externalEventTypes.push(externalEventType.name);
              }
            }
            if (!matchingEntry) {
              switch (parameterType) {
                case 'enum':
                  handleEnumAttribute(acc, parameterName, parameterDefinition, externalEventType);
                  break;
                case 'object':
                  recurseObjectAttributeProperties(acc, casted.properties, parameterName, externalEventType);
                  break;
                default:
                  acc[key] = {
                    externalEventTypes: [externalEventType.name],
                    label: `${parameterName} (${parameterType})`,
                    name: parameterName,
                    type: parameterType,
                  };
              }
            }
          },
        );
        return acc;
      },
      {},
    );
    parameterSubfields = Object.values(allParameterTypes).sort((a, b) => compare(a.label, b.label));
  }

  function handleEnumAttribute(
    acc: Record<string, ExternalEventLayerFilterSubfieldSchema>,
    parameterName: string,
    variants: any,
    externalEventType: ExternalEventType,
  ) {
    const matchingName = !!acc[parameterName];
    const matchingEntry = matchingName && acc[parameterName].type === 'variant';
    if (matchingEntry) {
      acc[parameterName].externalEventTypes.push(externalEventType.name);
    }
    if (!matchingEntry) {
      acc[parameterName] = {
        externalEventTypes: [externalEventType.name],
        label: parameterName,
        name: parameterName,
        type: 'variant',
        values: variants.enum,
      };
    }
  }

  function recurseObjectAttributeProperties(
    acc: Record<string, ExternalEventLayerFilterSubfieldSchema>,
    properties: any,
    parameterName: string,
    externalEventType: ExternalEventType,
  ) {
    let props: [string, any][] = Object.entries(properties);
    props.forEach(prop => {
      if (prop[1].properties) {
        recurseObjectAttributeProperties(acc, prop[1].properties, `${parameterName} -> ${prop[0]}`, externalEventType);
      } else {
        const key = `${parameterName} -> ${prop[0]}`;
        let type = prop[1].type;
        if (type === undefined && !!prop[1].enum) {
          type = 'enum';
        }
        const matchingName = !!acc[key];
        const matchingEntry = matchingName && acc[key].type === type;
        if (matchingEntry) {
          acc[key].externalEventTypes.push(externalEventType.name);
        }
        if (!matchingEntry) {
          if (type !== 'enum') {
            acc[key] = {
              externalEventTypes: [externalEventType.name],
              label: `${key} (${type})`,
              name: key,
              type: type,
            };
          } else {
            handleEnumAttribute(acc, `${parameterName} -> ${prop[0]}`, prop[1], externalEventType);
          }
        }
      }
    });
  }

  // Schema for dynamic type filters
  $: dynamicTypeFilterSchema = {
    Type: {
      does_not_equal: { type: 'variant', values: $externalEventTypes.map(type => type.name) },
      does_not_include: { type: 'string' },
      equals: { type: 'variant', values: $externalEventTypes.map(type => type.name) },
      includes: { type: 'string' },
    },
  };

  // Schema for other filters
  $: otherFilterSchema = {
    Attribute: {
      subfields: parameterSubfields,
    },
    Name: {
      does_not_equal: { type: 'string' },
      does_not_include: { type: 'string' },
      equals: { type: 'string' },
      includes: { type: 'string' },
    },
  };

  // Schema for type subfilters (filters on individual result types)
  $: typeSubfilterSchema = {
    Attribute: {
      subfields: parameterSubfields,
    },
    Name: {
      does_not_equal: { type: 'string' },
      does_not_include: { type: 'string' },
      equals: { type: 'string' },
      includes: { type: 'string' },
    },
  };

  function handleFilterChange(event: CustomEvent<{ filter: ExternalEventLayerFilter }>) {
    dirtyFilter = event.detail.filter;
  }
</script>

<FilterBuilder
  bind:this={filterBuilder}
  mode="externalEvent"
  title="External Event Filtering"
  {filter}
  {layerName}
  allTypes={$externalEventTypes}
  {matchingTypes}
  {instanceCount}
  TypeIcon={TagIcon}
  InstanceIcon={ExternalEventIcon}
  {dynamicTypeFilterSchema}
  {otherFilterSchema}
  {typeSubfilterSchema}
  dynamicTypeFilterHint="Type includes..."
  otherFilterHint="Names, attributes"
  noItemsMessage="No external events matching your filter"
  defaultDynamicTypeField="Type"
  defaultOtherFilterField="Name"
  on:filterChange
  on:filterChange={handleFilterChange}
  on:rename
  on:visibilityChange
>
  <slot name="trigger" slot="trigger" />
</FilterBuilder>
