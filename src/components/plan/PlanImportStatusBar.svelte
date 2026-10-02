<svelte:options immutable={true} />

<script lang="ts">
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { PlanImportStatus } from '../../enums/planStatusMessages';
  import type { PlanImportRequest } from '../../types/plan';

  export let planImportRequest: PlanImportRequest | null = null;

  let statusMessage: string = '';

  $: switch (planImportRequest?.status) {
    case PlanImportStatus.FAILED:
      statusMessage = 'Plan import failed';
      break;
    case PlanImportStatus.IMPORTING_PLAN:
      statusMessage = 'Importing activities';
      break;
    case PlanImportStatus.EXTRACTING_MODEL:
      statusMessage = 'Extracting model from plan';
      break;
    case PlanImportStatus.IMPORTING_DATASET:
      statusMessage = 'Importing datasets';
      break;
    default:
      statusMessage = '';
  }
</script>

{#if planImportRequest && planImportRequest.status !== PlanImportStatus.COMPLETE}
  {#if planImportRequest.status === PlanImportStatus.FAILED}
    <div class="flex items-center justify-between border-b border-[var(--st-red)] bg-red-50 px-4 py-2.5">
      <div class="flex items-center gap-2.5 font-medium text-[var(--st-gray-100,#1b1d1e)]">
        <span
          class="inline-flex items-center gap-2 rounded-[16px] border border-[var(--st-gray-100,#1b1d1e)] bg-[var(--st-white,#fff)] px-3 py-1"
          ><WarningIcon class="red-icon" /> {statusMessage}
        </span>{planImportRequest.reason.message}
      </div>
    </div>
  {:else}
    <div class="flex items-center justify-between border-b border-[var(--st-blue)] bg-blue-50 px-4 py-2.5">
      <div class="flex items-center gap-2.5 font-medium text-[var(--st-gray-100,#1b1d1e)]">
        <span
          ><b>Import in progress.</b> This plan is read-only and data may continue to change until the import completes.</span
        >
        <span
          class="inline-flex items-center gap-2 rounded-[16px] border border-[var(--st-gray-100,#1b1d1e)] bg-[var(--st-white,#fff)] px-3 py-1"
          >Current step: {statusMessage}
        </span>
      </div>
    </div>
  {/if}
{/if}
