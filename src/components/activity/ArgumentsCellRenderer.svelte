<script lang="ts">
  import type { ActivityDirective, ActivityType } from '../../types/activity';
  import { formatParameterValue } from '../../utilities/parameters';

  export let data: ActivityDirective;
  export let activityTypes: ActivityType[];

  let formattedArguments: { key: string; value: string }[] = [];

  $: {
    const args = data?.arguments;
    const activityTypeName = data?.type;

    if (!args || typeof args !== 'object') {
      formattedArguments = [];
    } else {
      const activityType = activityTypes.find((type: ActivityType) => type.name === activityTypeName);

      formattedArguments = Object.entries(args)
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
    }
  }
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
