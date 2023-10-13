<svelte:options immutable={true} />

<script lang="ts">
  import HistoryIcon from '@nasa-jpl/stellar/icons/history.svg?component';
  import { createEventDispatcher, onMount } from 'svelte';
  import { plan } from '../../stores/plan';
  import type {
    ActivityDirective,
    ActivityDirectiveRevision,
    ActivityDirectivesMap,
    ActivityType,
  } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { ArgumentsMap } from '../../types/parameter';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { convertUsToDurationString, getDoyTimeFromInterval } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';

  const dispatch = createEventDispatcher();
  const updatePermissionError = 'You do not have permission to update this activity';

  export let activityDirective: ActivityDirective;
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let activityTypes: ActivityType[] = [];
  export let modelId: number;
  export let planStartTimeYmd: string;
  export let user: User | null;

  let hasUpdatePermission: boolean = false;
  $: if (user !== null && $plan !== null) {
    hasUpdatePermission = featurePermissions.activityDirective.canUpdate(user, $plan, activityDirective);
  }

  let activityRevisions: ActivityDirectiveRevision[];
  $: activityRevisions = [];

  let activityRevisionChangeMap: { currentValue: string; name: string; previousValue: string }[] = [];
  $: activityRevisionChangeMap = [];

  $: activityType =
    (activityTypes ?? []).find(({ name: activityTypeName }) => activityDirective?.type === activityTypeName) ?? null;

  let effectiveRevisionArguments: (ArgumentsMap | undefined)[];
  $: effectiveRevisionArguments = [];

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString(undefined, {
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      month: 'numeric',
      year: '2-digit',
    });
  }

  function formatParameterValue(parameterName: string, parameterValue: any) {
    if (!activityType?.parameters || !activityType.parameters[parameterName]) {
      return parameterValue;
    }

    const parameterType = activityType.parameters[parameterName].schema.type;
    switch (parameterType) {
      case 'duration':
        return convertUsToDurationString(parameterValue);
      default:
        return parameterValue;
    }
  }

  function diffObjects(
    label: string,
    current: any,
    previous: any,
    accumulator: { [name: string]: { currentValue: any; previousValue: any } },
  ) {
    Object.keys(current).forEach(key => {
      if (typeof current[key] === 'object') {
        return diffObjects(`${label} > ${key}`, current[key], previous[key], accumulator);
      }

      if (current[key] !== previous[key]) {
        accumulator[`${label} > ${key}`] = {
          currentValue: current[key],
          previousValue: previous[key],
        };
      }
    });

    return accumulator;
  }

  function diffRevisions(current: ActivityDirectiveRevision, previous: ActivityDirectiveRevision) {
    let differences: { [name: string]: { currentValue: any; previousValue: any } } = {};

    // Build list of all arguments that differ
    Object.keys(current.arguments).forEach(argument => {
      if (typeof current.arguments[argument] === 'object') {
        diffObjects(argument, current.arguments[argument], previous.arguments[argument], differences);
      } else if (current.arguments[argument] !== previous.arguments[argument]) {
        differences[argument] = {
          currentValue: current.arguments[argument],
          previousValue: previous.arguments[argument],
        };
      }
    });

    // Manually check remaining fields that could have changed and require extra formatting

    if (current.start_offset !== previous.start_offset) {
      const currentStartTimeDoy = getDoyTimeFromInterval(planStartTimeYmd, current.start_offset);
      const previousStartTimeDoy = getDoyTimeFromInterval(planStartTimeYmd, previous.start_offset);

      differences['Start Time'] = {
        currentValue: currentStartTimeDoy,
        previousValue: previousStartTimeDoy,
      };
    }

    if (current.anchored_to_start !== previous.anchored_to_start) {
      differences['Anchor'] = {
        currentValue: current.anchored_to_start ? 'Start' : 'End',
        previousValue: previous.anchored_to_start ? 'Start' : 'End',
      };
    }

    if (current.anchor_id !== previous.anchor_id) {
      const currentAnchorDirective = current.anchor_id
        ? activityDirectivesMap[current.anchor_id].name
        : 'Unknown Directive';
      const previousAnchorDirective = previous.anchor_id
        ? activityDirectivesMap[previous.anchor_id].name
        : 'Unknown Directive';
      differences['Anchored To'] = {
        currentValue: current.anchor_id ? `${current.anchor_id} - ${currentAnchorDirective}` : 'Plan',
        previousValue: previous.anchor_id ? `${previous.anchor_id} - ${previousAnchorDirective}` : 'Plan',
      };
    }

    if (current.name !== previous.name) {
      differences['Name'] = {
        currentValue: current.name,
        previousValue: previous.name,
      };
    }

    const changedProperties = Object.keys(differences);
    const firstChange = changedProperties.length
      ? differences[changedProperties[0]]
      : { currentValue: '', previousValue: '' };

    if (changedProperties.length > 1) {
      return { currentValue: `${changedProperties.length} Changes`, name: 'Multiple Changes', previousValue: '' };
    } else if (changedProperties.length === 0) {
      // Catch edge-case scenarios where there a no differences between revisions
      // e.g. an API update that didn't actually change anything, or creating a preset from the current parameter values
      return { currentValue: '', name: 'No Changes', previousValue: '' };
    }

    return {
      currentValue: firstChange.currentValue,
      name: changedProperties[0] || '',
      previousValue: firstChange.previousValue,
    };
  }

  async function restoreRevision(revisionId: number) {
    if (!$plan) {
      return;
    }

    const { id: activityId } = activityDirective;
    const restored = await effects.restoreActivityFromChangelog(activityId, $plan, revisionId, user);

    if (restored) {
      dispatch('closeChangelog');
    }
  }

  onMount(async () => {
    const { id: activityId, plan_id: planId } = activityDirective;
    activityRevisions = await effects.getActivityDirectiveChangelog(planId, activityId, user);

    // Get default set of effective arguments
    const effectiveDefaultArguments = await effects.getEffectiveActivityArguments(
      modelId,
      activityType?.name || '',
      {},
      user,
    );

    // Get effective arguments for all revisions by coalescing defaults with args supplied in revision
    effectiveRevisionArguments = activityRevisions.map(revision => {
      return {
        ...effectiveDefaultArguments?.arguments,
        ...revision.arguments,
      };
    });

    // Build a summary of changes by comparing two revisions and their effective arguments
    activityRevisionChangeMap = activityRevisions.map((activityRevision, i) => {
      const previousRevision = activityRevisions[i + 1];

      // At some point there will be no previous revision to compute a difference from
      if (!previousRevision) {
        return { currentValue: '', name: 'Earliest Known Revision', previousValue: '' };
      }

      return diffRevisions(
        { ...activityRevision, arguments: { ...effectiveRevisionArguments[i] } },
        { ...previousRevision, arguments: { ...effectiveRevisionArguments[i + 1] } },
      );
    });
  });
</script>

<div class="activity-header">
  <div class="activity-header-title">
    <div class="activity-header-title-value st-typography-medium">
      {activityDirective.name}
    </div>
  </div>
  <div>
    <button
      class="st-button icon activity-header-changelog"
      on:click|stopPropagation={() => dispatch('closeChangelog')}
      use:tooltip={{ content: 'Close Activity Changelog', placement: 'top' }}
    >
      <HistoryIcon />
    </button>
  </div>
</div>

<div class="activity-revisions">
  {#if activityRevisionChangeMap.length}
    {#each activityRevisions as revision, i}
      <div class="activity-revision">
        <div class="date st-typography-medium">{formatDate(revision.changed_at)}</div>
        <div
          class="change-summary st-typography-body"
          use:tooltip={{ content: activityRevisionChangeMap[i].name, placement: 'top' }}
        >
          {activityRevisionChangeMap[i].name}
        </div>
        <div class="changed-by st-typography-label">@{revision.changed_by}</div>
        <div
          class="new-value st-typography-body"
          use:tooltip={{
            content: formatParameterValue(activityRevisionChangeMap[i].name, activityRevisionChangeMap[i].currentValue),
            placement: 'top',
          }}
        >
          {formatParameterValue(activityRevisionChangeMap[i].name, activityRevisionChangeMap[i].currentValue)}
        </div>
        <div class="actions">
          {#if i == 0}
            <span>Current Revision</span>
          {:else}
            <button
              class="st-button"
              use:permissionHandler={{
                hasPermission: hasUpdatePermission,
                permissionError: updatePermissionError,
              }}
              on:click={() => restoreRevision(revision.revision)}>Restore</button
            >
            <button class="st-button secondary" on:click={() => dispatch('previewRevision', revision)}>Preview</button>
          {/if}
        </div>
        <div
          class="previous-value st-typography-body"
          use:tooltip={{
            content: formatParameterValue(
              activityRevisionChangeMap[i].name,
              activityRevisionChangeMap[i].previousValue,
            ),
            placement: 'top',
          }}
        >
          {formatParameterValue(activityRevisionChangeMap[i].name, activityRevisionChangeMap[i].previousValue)}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .activity-header {
    align-items: center;
    background: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-15);
    display: flex;
    flex-shrink: 0;
    font-style: italic;
    padding: 4px 8px;
    padding-left: 8px;
  }

  .activity-header-title {
    align-items: flex-start;
    display: flex;
    justify-items: center;
    padding-left: 8px;
    width: 100%;
  }

  .activity-revision {
    align-content: center;
    border: 1px solid transparent;
    border-radius: 4px;
    column-gap: 2px;
    display: grid;
    font-size: 12px;
    font-weight: 400;
    grid-template-columns: 10.5em 1fr;
    line-height: 16px;
    margin: 8px 8px 0px 8px;
    padding: 4px;
    row-gap: 4px;
  }

  .activity-revision:last-child {
    margin-bottom: 8px;
  }

  .activity-revision:hover {
    background-color: #f8f8f8;
    border-color: #ebecec;
  }

  .activity-header-changelog {
    background-color: #007bff10;
    border: 1px solid #007bff82;
    color: #007bff;
    display: flex;
    width: 24px;
  }

  .new-value,
  .previous-value,
  .change-summary {
    height: 1rem;
    overflow: hidden;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions > * {
    display: none;
    height: 16px;
    line-height: 16px;
    margin: 0;
  }

  .actions button {
    padding: 0 4px;
  }

  .actions .secondary {
    border: 1px solid #bec0c2;
  }

  .activity-revision:hover .actions > * {
    display: inline-flex;
  }

  .new-value {
    color: #265fc5;
  }

  .previous-value {
    color: #a91900;
    text-decoration: line-through;
  }
</style>
