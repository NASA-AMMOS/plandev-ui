<script lang="ts">
  import type { ActivityType } from '../../types/activity';
  import type { ArgumentsMap } from '../../types/parameter';
  import { formatParameterValue } from '../../utilities/parameters';

  export let activityTypeName: string;
  export let activityTypes: ActivityType[];
  export let args: ArgumentsMap;
  export let defaultArgs: ArgumentsMap = {};

  let formattedArguments: { isDefault: boolean; key: string; value: string }[] = [];

  $: {
    if (!args || typeof args !== 'object') {
      formattedArguments = [];
    } else {
      const activityType = activityTypes.find((type: ActivityType) => type.name === activityTypeName);

      // Coalesce mission model defaults with the explicitly set arguments so the
      // cell matches the effective arguments shown in the activity form
      formattedArguments = Object.entries({ ...defaultArgs, ...args })
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
          return { isDefault: !(key in args), key, value: formattedValue };
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
</style>
