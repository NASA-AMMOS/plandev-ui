<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActivityComparisonResult } from '../../types/plan-comparison';
  import Collapse from '../Collapse.svelte';

  export let results: ActivityComparisonResult[];
  export let selectedActivityId: number | null;

  const dispatch = createEventDispatcher<{
    select: { activityId: number };
  }>();

  // Group results by change type
  $: added = results.filter(r => r.changeType === 'added');
  $: deleted = results.filter(r => r.changeType === 'deleted');
  $: modified = results.filter(r => r.changeType === 'matched' && r.changedFields.length > 0);
  $: unchanged = results.filter(r => r.changeType === 'matched' && r.changedFields.length === 0);

  function getActivityId(result: ActivityComparisonResult): number {
    if (result.changeType === 'matched') {
      return result.leftActivity.id;
    }
    return result.activity.id;
  }

  function getActivityName(result: ActivityComparisonResult): string {
    if (result.changeType === 'matched') {
      return result.leftActivity.name;
    }
    return result.activity.name;
  }

  function getActivityType(result: ActivityComparisonResult): string {
    if (result.changeType === 'matched') {
      return result.leftActivity.type;
    }
    return result.activity.type;
  }

  function handleSelect(result: ActivityComparisonResult) {
    dispatch('select', { activityId: getActivityId(result) });
  }

  function isSelected(result: ActivityComparisonResult): boolean {
    if (selectedActivityId === null) {return false;}
    if (result.changeType === 'matched') {
      return result.leftActivity.id === selectedActivityId || result.rightActivity.id === selectedActivityId;
    }
    return result.activity.id === selectedActivityId;
  }

  function getConfidenceClass(result: ActivityComparisonResult): string {
    if (result.changeType !== 'matched') {return '';}
    if (result.confidenceLevel === 'medium') {return 'possibly-related';}
    if (result.matchType === 'ambiguous') {return 'ambiguous';}
    return '';
  }
</script>

<div class="activity-list">
  {#if added.length > 0}
    <Collapse title="Added ({added.length})" defaultExpanded={true}>
      <div class="activity-group added">
        {#each added as result (getActivityId(result))}
          <button
            class="activity-item"
            class:selected={isSelected(result)}
            on:click={() => handleSelect(result)}
          >
            <span class="activity-indicator added">+</span>
            <span class="activity-name">{getActivityName(result)}</span>
            <span class="activity-type">{getActivityType(result)}</span>
          </button>
        {/each}
      </div>
    </Collapse>
  {/if}

  {#if deleted.length > 0}
    <Collapse title="Deleted ({deleted.length})" defaultExpanded={true}>
      <div class="activity-group deleted">
        {#each deleted as result (getActivityId(result))}
          <button
            class="activity-item"
            class:selected={isSelected(result)}
            on:click={() => handleSelect(result)}
          >
            <span class="activity-indicator deleted">-</span>
            <span class="activity-name">{getActivityName(result)}</span>
            <span class="activity-type">{getActivityType(result)}</span>
          </button>
        {/each}
      </div>
    </Collapse>
  {/if}

  {#if modified.length > 0}
    <Collapse title="Modified ({modified.length})" defaultExpanded={true}>
      <div class="activity-group modified">
        {#each modified as result (getActivityId(result))}
          <button
            class="activity-item {getConfidenceClass(result)}"
            class:selected={isSelected(result)}
            on:click={() => handleSelect(result)}
          >
            <span class="activity-indicator modified">~</span>
            <span class="activity-name">{getActivityName(result)}</span>
            <span class="activity-type">{getActivityType(result)}</span>
            {#if result.changeType === 'matched'}
              <span class="change-count">{result.changedFields.length} change{result.changedFields.length !== 1 ? 's' : ''}</span>
              {#if result.confidenceLevel === 'medium' || result.matchType === 'ambiguous'}
                <span class="warning-icon" title="Possibly related - match confidence is medium">
                  ⚠
                </span>
              {/if}
            {/if}
          </button>
        {/each}
      </div>
    </Collapse>
  {/if}

  {#if unchanged.length > 0}
    <Collapse title="Unchanged ({unchanged.length})" defaultExpanded={false}>
      <div class="activity-group unchanged">
        {#each unchanged as result (getActivityId(result))}
          <button
            class="activity-item"
            class:selected={isSelected(result)}
            on:click={() => handleSelect(result)}
          >
            <span class="activity-indicator unchanged">=</span>
            <span class="activity-name">{getActivityName(result)}</span>
            <span class="activity-type">{getActivityType(result)}</span>
          </button>
        {/each}
      </div>
    </Collapse>
  {/if}

  {#if results.length === 0}
    <div class="empty-list">
      <span class="st-typography-label">No activities to compare</span>
    </div>
  {/if}
</div>

<style>
  .activity-list {
    display: flex;
    flex-direction: column;
  }

  .activity-group {
    display: flex;
    flex-direction: column;
  }

  .activity-item {
    align-items: center;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--st-gray-15);
    cursor: pointer;
    display: flex;
    gap: 8px;
    padding: 8px 16px;
    text-align: left;
    transition: background-color 0.15s ease;
    width: 100%;
  }

  .activity-item:hover {
    background: var(--st-gray-10);
  }

  .activity-item.selected {
    background: var(--st-primary-10);
  }

  .activity-item.possibly-related,
  .activity-item.ambiguous {
    background: rgba(255, 237, 72, 0.05);
  }

  .activity-item.possibly-related:hover,
  .activity-item.ambiguous:hover {
    background: rgba(255, 237, 72, 0.1);
  }

  .activity-indicator {
    border-radius: 2px;
    font-family: var(--st-font-mono);
    font-size: 12px;
    font-weight: bold;
    height: 18px;
    line-height: 18px;
    min-width: 18px;
    text-align: center;
  }

  .activity-indicator.added {
    background: rgba(0, 200, 83, 0.2);
    color: var(--st-green);
  }

  .activity-indicator.deleted {
    background: rgba(255, 59, 48, 0.2);
    color: var(--st-red);
  }

  .activity-indicator.modified {
    background: rgba(255, 165, 0, 0.2);
    color: var(--st-orange);
  }

  .activity-indicator.unchanged {
    background: var(--st-gray-15);
    color: var(--st-gray-50);
  }

  .activity-name {
    flex: 1;
    font-size: 13px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .activity-type {
    color: var(--st-gray-50);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .change-count {
    background: var(--st-gray-15);
    border-radius: 10px;
    color: var(--st-gray-60);
    font-size: 11px;
    padding: 2px 8px;
  }

  .warning-icon {
    color: var(--st-yellow);
    font-size: 14px;
  }

  .empty-list {
    color: var(--st-gray-50);
    padding: 32px;
    text-align: center;
  }
</style>
