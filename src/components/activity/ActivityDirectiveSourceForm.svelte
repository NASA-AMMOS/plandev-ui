<svelte:options immutable={true} />

<script lang="ts">
  import type { ActivityDirective, ActivityDirectivesMap, ActivityType } from '../../types/activity';
  import type { ActivityMetadataDefinition } from '../../types/activity-metadata';
  import type { User } from '../../types/app';
  import type { PlanMergeActivityDirectiveSource } from '../../types/plan';
  import ActivityDirectiveForm from './ActivityDirectiveForm.svelte';

  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let activityMetadataDefinitions: ActivityMetadataDefinition[] = [];
  export let activityTypes: ActivityType[] = [];
  export let computedSourceActivity: PlanMergeActivityDirectiveSource | null;
  export let highlightKeys: string[] = [];
  export let modelId: number;
  export let planId: number;
  export let planStartTimeYmd: string;
  export let user: User | null;

  let activityDirective: ActivityDirective;

  $: if (computedSourceActivity) {
    activityDirective = {
      ...computedSourceActivity,
      plan_id: planId,
    };
  }
</script>

{#if activityDirective}
  <ActivityDirectiveForm
    {activityDirective}
    {activityDirectivesMap}
    {activityMetadataDefinitions}
    {activityTypes}
    editable={false}
    {highlightKeys}
    {modelId}
    {planStartTimeYmd}
    showActivityName
    showHeader={false}
    {user}
  />
{/if}
