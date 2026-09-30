<svelte:options immutable={true} />

<script lang="ts">
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { LoaderCircle, LockKeyhole } from 'lucide-svelte';
  import { PlanImportStatus } from '../../enums/planStatusMessages';
  import { tooltip } from '../../utilities/tooltip';

  export let isReadOnly: boolean = false;
  export let importStatus: PlanImportStatus | null = null;
  export let importError: string | null = null;
  export let name: string;
  export let size: number = 16;

  let importStatusMessage: string | null = null;

  $: if (importStatus !== null) {
    switch (importStatus) {
      case PlanImportStatus.FAILED:
        importStatusMessage = importError;
        break;
      case PlanImportStatus.IMPORTING_PLAN:
        importStatusMessage = 'Importing plan';
        break;
      case PlanImportStatus.EXTRACTING_MODEL:
        importStatusMessage = 'Extracting model from plan';
        break;
      case PlanImportStatus.IMPORTING_DATASET:
        importStatusMessage = 'Importing datasets';
        break;
      default:
        importStatusMessage = null;
    }
  }
</script>

{#if isReadOnly}
  <div class="grid w-full grid-cols-[min-content_auto] items-center gap-2">
    {#if importStatus !== null && importStatus !== PlanImportStatus.COMPLETE}
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
