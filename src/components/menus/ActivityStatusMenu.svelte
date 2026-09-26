<svelte:options immutable={true} />

<script lang="ts">
  import { ChartGantt } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { Status } from '../../enums/status';
  import type { ActivityDirectiveValidationStatus } from '../../types/activity';
  import type { ActivityErrorCounts } from '../../types/console';
  import PlanNavButton from '../plan/PlanNavButton.svelte';
  import ActivityErrorsRollup from '../ui/ActivityErrorsRollup.svelte';

  export let activityErrorCounts: ActivityErrorCounts;
  export let activityDirectiveValidationStatuses: ActivityDirectiveValidationStatus[] = [];
  export let invalidActivityCount: number = 0;
  export let isModelExecutable: boolean = true;
  export let compactNavMode: boolean = false;

  const dispatch = createEventDispatcher<{
    viewActivityValidations: void;
  }>();

  let totalActivitiesCheckedCount: number = 0;
  let activityStatus: Status | null = null;

  $: totalActivitiesCheckedCount = activityDirectiveValidationStatuses.reduce((prevCount, validationStatus) => {
    return prevCount + (validationStatus.status === 'complete' ? 1 : 0);
  }, 0);

  $: activityStatus = invalidActivityCount > 0 ? Status.Failed : Status.Complete;

  function onClickViewConsole() {
    dispatch('viewActivityValidations');
  }
</script>

<PlanNavButton
  title={!compactNavMode ? 'Activities' : ''}
  menuTitle="Activity Status"
  showStatusInMenu={false}
  statusBadgeText={isModelExecutable ? `${invalidActivityCount}` : ''}
  status={isModelExecutable ? activityStatus : null}
>
  <ChartGantt size={20} />
  <svelte:fragment slot="metadata">
    <div class="activity-status-nav-container">
      {#if !isModelExecutable}
        <div class="total-count">Activity Validation Unavailable</div>
      {:else}
        <div class="total-count">
          {totalActivitiesCheckedCount}/{activityDirectiveValidationStatuses.length} activit{activityDirectiveValidationStatuses.length !==
          1
            ? 'ies'
            : 'y'} checked
        </div>
        {#if invalidActivityCount === 0}
          <div class="no-errors">No problems detected</div>
        {:else}
          <div class="invalid-count">
            {invalidActivityCount} activit{invalidActivityCount !== 1 ? 'ies' : 'y'}
            {invalidActivityCount !== 1 ? 'have' : 'has'} problems
          </div>
        {/if}
        <div class="activity-status-nav">
          <ActivityErrorsRollup counts={activityErrorCounts} selectable={false} showTotalCount={false} />
        </div>
        <button on:click={onClickViewConsole} class="st-button secondary view-button">View in console</button>
      {/if}
    </div>
  </svelte:fragment>
</PlanNavButton>

<style>
  .activity-status-nav-container {
    display: grid;
    grid-template-columns: max-content;
    row-gap: 5px;
  }

  .total-count {
    color: var(--st-primary-text-color, #000);
  }

  .no-errors {
    color: var(--st-success-green);
  }

  .invalid-count {
    color: var(--st-error-red);
  }

  .activity-status-nav {
    width: 200px;
  }

  .st-button.view-button {
    width: 100%;
  }
</style>
