<svelte:options immutable={true} />

<script lang="ts">
  import { externalEventTypes } from '../../stores/external-event';
  import { field } from '../../stores/form';
  import { plugins } from '../../stores/plugins';
  import type { ExternalEvent, ExternalEventType } from '../../types/external-event';
  import type { FieldStore } from '../../types/form';
  import type { ArgumentsMap, ParametersMap } from '../../types/parameter';
  import type { ValueSchema } from '../../types/schema';
  import {
    getFormParameters,
    translateJsonSchemaArgumentsToValueSchema,
    translateJsonSchemaToValueSchema,
  } from '../../utilities/parameters';
  import { formatDate } from '../../utilities/time';
  import Collapse from '../Collapse.svelte';
  import DatePickerField from '../form/DatePickerField.svelte';
  import Input from '../form/Input.svelte';
  import Parameters from '../parameters/Parameters.svelte';

  export let externalEvent: ExternalEvent;
  export let showHeader: boolean = true;

  let externalEventAttributes: ArgumentsMap = {};

  let externalEventType: ExternalEventType | undefined = undefined;
  let externalEventTypeParametersMap: ParametersMap = {};
  let startTimeField: FieldStore<string>;
  let requiredAttributes: string[] = [];

  $: externalEventType = $externalEventTypes.find(eventType => eventType.name === externalEvent.pkey.event_type_name);
  $: externalEventAttributes = translateJsonSchemaArgumentsToValueSchema(externalEvent.attributes);

  $: if (externalEventType !== undefined) {
    // Create a ParametersMap for the External Event Type
    const externalEventTypeAttributesTranslated = translateJsonSchemaToValueSchema(externalEventType?.attribute_schema);
    externalEventTypeParametersMap = Object.entries(externalEventTypeAttributesTranslated).reduce(
      (acc: ParametersMap, currentAttribute: [string, ValueSchema], index: number) => {
        acc[currentAttribute[0]] = {
          order: index,
          schema: currentAttribute[1],
        };
        return acc;
      },
      {} as ParametersMap,
    );

    // Get the set of required attribute names
    requiredAttributes =
      $externalEventTypes.find(eventType => eventType.name === externalEvent?.pkey.event_type_name)?.attribute_schema
        .required ?? [];
  }

  $: startTimeField = field<string>(`${formatDate(new Date(externalEvent.start_time), $plugins.time.primary.format)}`);
</script>

<div class="external-event-form-container">
  {#if showHeader}
    <div class="external-event-header">
      <div class="external-event-header-title">
        <div class="external-event-header-title-value st-typography-medium">
          {externalEvent.pkey.key}
        </div>
      </div>
    </div>
  {/if}

  <div class="external-event-form">
    <fieldset>
      <Collapse title="Definition">
        <Input layout="inline">
          Type
          <input class="st-input w-full" disabled={true} name="event-type" value={externalEvent.pkey.event_type_name} />
        </Input>

        <DatePickerField
          layout="inline"
          disabled={true}
          field={startTimeField}
          label={`Start Time (${$plugins.time.primary.label})`}
          name="start-time"
        />

        <Input layout="inline">
          Duration
          <input class="st-input w-full" disabled={true} name="duration" value={externalEvent.duration} />
        </Input>

        <Input layout="inline">
          Source ID
          <input class="st-input w-full" disabled={true} name="source-key" value={externalEvent.pkey.source_key} />
        </Input>

        <Input layout="inline">
          Source File
          <input
            class="st-input w-full"
            disabled={true}
            name="source-key-resolved"
            value={externalEvent.pkey.source_key}
          />
        </Input>
      </Collapse>
      <Collapse defaultExpanded={false} title="Attributes" tooltipContent="View External Event Attributes">
        {#if Object.keys(externalEvent.attributes).length === 0}
          <div class="st-typography-label">No Attributes Found</div>
        {:else}
          <div class="st-typography-body">
            <Parameters
              disabled={true}
              expanded={false}
              formParameters={getFormParameters(
                externalEventTypeParametersMap,
                externalEventAttributes,
                requiredAttributes,
                undefined,
                undefined,
                [],
                'option',
                true,
              )}
            />
          </div>
        {/if}
      </Collapse>
    </fieldset>
  </div>
</div>

<style>
  .external-event-form-container {
    display: grid;
    grid-template-rows: min-content auto;
    height: 100%;
    overflow: hidden;
  }

  .external-event-form {
    overflow-y: auto;
  }

  .external-event-header {
    align-items: center;
    background: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-15);
    display: flex;
    flex-shrink: 0;
    font-style: italic;
    padding: 4px 8px;
    padding-left: 8px;
  }

  .external-event-header-title-value {
    word-break: break-word;
  }

  .external-event-header-title-value {
    overflow: hidden;
    padding: 4px 0px;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;
  }

  .external-event-header-title {
    align-items: flex-start;
    border-radius: 4px;
    display: flex;
    width: 100%;
  }

  .external-event-header-title :global(fieldset) {
    padding: 0;
    width: 100%;
  }
</style>
