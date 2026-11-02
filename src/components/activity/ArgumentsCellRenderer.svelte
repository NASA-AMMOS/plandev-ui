<script lang="ts">
  import type { ActivityType } from '../../types/activity';
  import type { ArgumentsMap } from '../../types/parameter';
  import { formatParameterValue, getArgument } from '../../utilities/parameters';

  export let activityTypeName: string;
  export let activityTypes: ActivityType[];
  export let args: ArgumentsMap;
  export let presetArgs: ArgumentsMap = {};
  export let defaultArgs: ArgumentsMap = {};

  let formattedArguments: { isDefault: boolean; key: string; value: string }[] = [];

  $: {
    if (!args || typeof args !== 'object') {
      formattedArguments = [];
    } else {
      const activityType = activityTypes.find((type: ActivityType) => type.name === activityTypeName);

      // Resolve each argument in the same order as the activity form (user -> preset -> mission model)
      // so the cell matches the effective arguments shown there
      formattedArguments = Object.keys({ ...defaultArgs, ...presetArgs, ...args })
        .sort((keyA, keyB) => {
          const orderA = activityType?.parameters[keyA]?.order ?? Number.MAX_SAFE_INTEGER;
          const orderB = activityType?.parameters[keyB]?.order ?? Number.MAX_SAFE_INTEGER;
          // If orders are the same, fall back to alphabetical
          if (orderA === orderB) {
            return keyA.localeCompare(keyB);
          }
          return orderA - orderB;
        })
        .map(key => {
          const parameterSchema = activityType?.parameters[key]?.schema;
          if (!parameterSchema) {
            return { isDefault: false, key, value: String(args[key] ?? presetArgs[key] ?? defaultArgs[key]) };
          }
          const { value, valueSource } = getArgument(args[key], parameterSchema, presetArgs[key], defaultArgs[key]);
          return {
            isDefault: valueSource === 'mission',
            key,
            // getArgument returns an editing placeholder (e.g. [] or a struct of nulls) when there is no
            // value anywhere; render those as blank so the cell matches what it showed before
            value: valueSource === 'none' ? '' : formatParameterValue(value, parameterSchema),
          };
        });
    }
  }
</script>

<div class="arguments-container">
  {#each formattedArguments as { isDefault, key, value }}
    <div class="argument-line" class:argument-line--default={isDefault}>
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

  .argument-line--default {
    color: var(--st-gray-60);
  }

  /* Drop the bold on default-sourced keys so they contrast with explicitly set arguments */
  .argument-line--default strong {
    font-weight: normal;
  }
</style>
