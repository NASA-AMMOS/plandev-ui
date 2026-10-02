<svelte:options immutable={true} />

<script lang="ts">
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { LoaderCircle, LockKeyhole } from 'lucide-svelte';
  import { PlanImportStatus } from '../../enums/planStatusMessages';
  import { getPlanImportStatusMessage } from '../../utilities/plan';
  import { tooltip } from '../../utilities/tooltip';

  export let isReadOnly: boolean = false;
  export let importStatus: PlanImportStatus | null = null;
  export let importError: string | null = null;
  export let name: string;
  export let size: number = 16;

  $: importStatusMessage =
    importStatus === PlanImportStatus.FAILED ? importError : getPlanImportStatusMessage(importStatus);
</script>

{#if importStatus !== null || isReadOnly}
  <div class="grid w-full grid-cols-[min-content_auto] items-center gap-2">
    {#if importStatus !== null}
      <div use:tooltip={{ content: importStatusMessage }}>
        {#if importStatus !== PlanImportStatus.FAILED}
          <LoaderCircle {size} class="animate-spin opacity-75" />
        {:else}
          <WarningIcon {size} class="text-destructive" />
        {/if}
      </div>
    {:else}
      <LockKeyhole class="opacity-75" {size} />
    {/if}
    <span class="overflow-hidden text-ellipsis">{name}</span>
  </div>
{:else}
  <div class="grid w-full grid-cols-1 items-center gap-2">
    <span class="overflow-hidden text-ellipsis">{name}</span>
  </div>
{/if}
