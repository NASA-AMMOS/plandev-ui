<svelte:options immutable={true} />

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { ActivityDirective } from '../../types/activity';
  import type { Plan } from '../../types/plan';
  import {
    getActivityDirectivesClipboardCount,
    getActivityDirectivesToPaste,
    getPasteActivityDirectivesText,
  } from '../../utilities/activities';
  import { permissionHandler } from '../../utilities/permissionHandler';

  const dispatch = createEventDispatcher<{
    createActivityDirectives: ActivityDirective[];
  }>();

  export let atTime: Date | undefined = undefined;
  export let hasCreatePermission: boolean = false;
  export let plan: Plan | null;
  export let planPermissionErrorText: string | null = null;

  async function pasteActivityDirectives(atTime: Date | undefined, clampToPlanBounds: boolean) {
    if (plan != null && hasCreatePermission) {
      const timeValue = atTime && atTime.getTime();
      const activities = await getActivityDirectivesToPaste(plan, clampToPlanBounds, timeValue);
      dispatch(`createActivityDirectives`, activities);
    }
  }
</script>

{#await getActivityDirectivesClipboardCount() then directivesInClipboard}
  {@const permissionError =
    planPermissionErrorText !== null
      ? planPermissionErrorText
      : directivesInClipboard && directivesInClipboard <= 0
        ? 'No activity directives in clipboard'
        : null}
  {@const hasPermission = hasCreatePermission && directivesInClipboard > 0}
  <div
    use:permissionHandler={{
      hasPermission,
      ...(permissionError !== null ? { permissionError } : null),
    }}
  >
    <ContextMenu.Item size="sm" on:click={() => pasteActivityDirectives(atTime, false)} disabled={!hasPermission}>
      {getPasteActivityDirectivesText(directivesInClipboard)}
      {atTime === undefined ? `` : `At Time`}
    </ContextMenu.Item>
    <!-- Only show other options in table/non-atTime setup -->
    {#if atTime === undefined && plan !== null}
      <ContextMenu.Item
        size="sm"
        on:click={() => pasteActivityDirectives(new Date(plan.start_time), false)}
        disabled={!hasPermission}
      >
        {getPasteActivityDirectivesText(directivesInClipboard)}
        At Plan Start
      </ContextMenu.Item>
      <ContextMenu.Item size="sm" on:click={() => pasteActivityDirectives(atTime, true)} disabled={!hasPermission}>
        {getPasteActivityDirectivesText(directivesInClipboard)}
        Clamped To Plan
      </ContextMenu.Item>
    {/if}
  </div>
{/await}
