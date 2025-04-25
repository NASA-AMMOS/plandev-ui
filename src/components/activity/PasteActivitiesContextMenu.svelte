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

  async function pasteActivityDirectives(atTime: Date | undefined) {
    if (plan != null && hasCreatePermission) {
      const timeValue = atTime && atTime.getTime();
      const activities = await getActivityDirectivesToPaste(plan, timeValue);
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
    <ContextMenu.Item size="sm" on:click={() => pasteActivityDirectives(atTime)} disabled={!hasPermission}>
      {getPasteActivityDirectivesText(directivesInClipboard)}
      {atTime === undefined ? `` : `At Time`}
    </ContextMenu.Item>
  </div>
{/await}
