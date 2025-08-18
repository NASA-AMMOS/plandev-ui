<script lang="ts">
  import type { ActivityDirective, ActivityType } from '../../types/activity';
  import type { ValueSchema } from '../../types/schema';
  import { convertUsToDurationString } from '../../utilities/time';

  export let data: ActivityDirective;
  export let activityTypes: ActivityType[];

  function formatParameterValue(value: any, schema: ValueSchema): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (schema.type) {
      case 'duration':
        try {
          return convertUsToDurationString(value, true);
        } catch (error) {
          return String(value);
        }

      case 'series':
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return '[]';
          } else {
            return `${value.map(String).join(', ')}`;
          }
        }
        return String(value);

      case 'struct':
        if (typeof value === 'object' && value !== null) {
          const keys = Object.keys(value);
          if (keys.length === 0) {
            return '{}';
          } else {
            const formattedFields = keys.map(key => `${key}: ${value[key]}`);
            return `${formattedFields.join(',\n')}`;
          }
        }
        return String(value);

      default:
        return String(value);
    }
  }

  $: formattedArguments = (() => {
    const args = data?.arguments;
    const activityTypeName = data?.type;

    if (!args || typeof args !== 'object') {
      return [];
    }

    const activityType = activityTypes.find((type: ActivityType) => type.name === activityTypeName);

    return Object.entries(args)
      .sort(([keyA], [keyB]) => {
        const orderA = activityType?.parameters[keyA]?.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = activityType?.parameters[keyB]?.order ?? Number.MAX_SAFE_INTEGER;
        // If orders are the same, fall back to alphabetical
        if (orderA === orderB) {
          return keyA.localeCompare(keyB);
        }
        return orderA - orderB;
      })
      .map(([key, value]) => {
        const parameterSchema = activityType?.parameters[key]?.schema;
        const formattedValue = parameterSchema ? formatParameterValue(value, parameterSchema) : String(value);
        return { key, value: formattedValue };
      });
  })();
</script>

<div class="arguments-container">
  {#each formattedArguments as { key, value }}
    <div class="argument-line">
      <strong>{key}:</strong>
      {value}
    </div>
  {/each}
</div>

<style>
  .arguments-container {
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .argument-line {
    margin-bottom: 0;
  }
</style>
