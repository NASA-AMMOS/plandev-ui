<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
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
    pasteActivityDirectives: ActivityDirective[];
  }>();

  export let hasCreatePermission: boolean = false;
  export let plan: Plan | null;
  export let planPermissionErrorText: string | null = null;

  let directivesInClipboard: number | null = null;

  onMount(() => {
    serializeClipboardCount();
  });

  async function serializeClipboardCount() {
    directivesInClipboard = null;
    const directivesCount = await getActivityDirectivesClipboardCount();
    directivesInClipboard = directivesCount > -1 ? directivesCount : null;
  }

  async function pasteActivityDirectives() {
    if (plan != null && hasCreatePermission) {
      if (directivesInClipboard && directivesInClipboard > 0) {
        const directives = await getActivityDirectivesToPaste(plan);
        dispatch(`pasteActivityDirectives`, directives);
      }
    }
  }
</script>

<ContextMenuItem
  use={[
    [
      permissionHandler,
      {
        hasPermission: hasCreatePermission && directivesInClipboard && directivesInClipboard > 0,
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
  on:click={pasteActivityDirectives}
>
  {#if directivesInClipboard}
    {getPasteActivityDirectivesText(directivesInClipboard)}
  {:else}
    Loading directives to paste
  {/if}
</ContextMenuItem>
