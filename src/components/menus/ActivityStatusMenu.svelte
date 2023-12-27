<svelte:options immutable={true} />

<script lang="ts">
  import WaterfallIcon from '@nasa-jpl/stellar/icons/waterfall.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { ActivityDirectiveValidationStatus } from '../../types/activity';
  import type { ActivityErrorCounts } from '../../types/errors';
  import { Status } from '../../utilities/status';
  import PlanNavButton from '../plan/PlanNavButton.svelte';
  import ActivityErrorsRollup from '../ui/ActivityErrorsRollup.svelte';

  export let activityErrorCounts: ActivityErrorCounts;
  export let activityDirectiveValidationStatuses: ActivityDirectiveValidationStatus[] = [];
  export let invalidActivityCount: number = 0;
  export let compactNavMode: boolean = false;

  const dispatch = createEventDispatcher();

  let totalActivitiesCheckedCount: number = 0;

  $: totalActivitiesCheckedCount = activityDirectiveValidationStatuses.reduce((prevCount, validationStatus) => {
    return prevCount + (validationStatus.status === 'complete' ? 1 : 0);
  }, 0);

  function onClickViewConsole() {
    dispatch('viewActivityValidations');
  }
</script>

<PlanNavButton
  title={!compactNavMode ? 'Activities' : ''}
  menuTitle="Activity Status"
  showStatusInMenu={false}
  statusBadgeText={`${invalidActivityCount}`}
  status={invalidActivityCount > 0 ? Status.Failed : Status.Complete}
>
  <WaterfallIcon />
  <svelte:fragment slot="metadata">
    <div class="activity-status-nav-container">
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
