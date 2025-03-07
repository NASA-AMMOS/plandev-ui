<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActivityDirective } from '../../types/activity';
  import type { Plan } from '../../types/plan';
  import {
    getActivityDirectivesClipboardCount,
    getActivityDirectivesToPaste,
    getPasteActivityDirectivesText,
  } from '../../utilities/activities';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import ContextMenuItem from '../context-menu/ContextMenuItem.svelte';

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
  <ContextMenuItem
    use={[
      [
        permissionHandler,
        {
          hasPermission: hasCreatePermission && directivesInClipboard > 0,
          permissionError: () => {
            if (planPermissionErrorText !== null) {
              return planPermissionErrorText;
            } else if (directivesInClipboard && directivesInClipboard <= 0) {
              return 'No activity directives in clipboard';
            } else {
              return null;
            }
          },
        },
      ],
    ]}
    on:click={() => pasteActivityDirectives(atTime)}
  >
    {getPasteActivityDirectivesText(directivesInClipboard)}
    {atTime === undefined ? `` : `At Time`}
  </ContextMenuItem>
{/await}
