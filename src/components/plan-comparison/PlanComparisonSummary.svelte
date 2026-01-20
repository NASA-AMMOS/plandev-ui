<svelte:options immutable={true} />

<script lang="ts">
  import type { ComparisonSource, PlanComparisonSummary as Summary } from '../../types/plan-comparison';

  export let leftSource: ComparisonSource | null;
  export let rightSource: ComparisonSource | null;
  export let summary: Summary | null;
</script>

<div class="comparison-summary">
  <div class="sources">
    <div class="source left">
      <span class="st-typography-label">Left</span>
      <span class="st-typography-medium source-name">
        {#if leftSource}
          {leftSource.name}
          <span class="source-type">({leftSource.type})</span>
        {:else}
          Not selected
        {/if}
      </span>
    </div>
    <div class="vs">vs</div>
    <div class="source right">
      <span class="st-typography-label">Right</span>
      <span class="st-typography-medium source-name">
        {#if rightSource}
          {rightSource.name}
          <span class="source-type">({rightSource.type})</span>
        {:else}
          Not selected
        {/if}
      </span>
    </div>
  </div>

  {#if summary}
    <div class="statistics">
      <div class="stat-row">
        <span class="stat-label">Total Activities</span>
        <span class="stat-value">{summary.total}</span>
      </div>

      <div class="stat-row added">
        <span class="stat-label">Added</span>
        <span class="stat-value">+{summary.added}</span>
      </div>

      <div class="stat-row deleted">
        <span class="stat-label">Deleted</span>
        <span class="stat-value">-{summary.deleted}</span>
      </div>

      <div class="stat-row modified">
        <span class="stat-label">Modified</span>
        <span class="stat-value">~{summary.modified}</span>
      </div>

      <div class="stat-row unchanged">
        <span class="stat-label">Unchanged</span>
        <span class="stat-value">{summary.matched.unchanged}</span>
      </div>

      {#if summary.matched.ambiguous > 0}
        <div class="stat-row ambiguous">
          <span class="stat-label">Possibly Related</span>
          <span class="stat-value">{summary.matched.ambiguous}</span>
        </div>
      {/if}
    </div>

    <div class="match-breakdown">
      <span class="st-typography-label">Match Types</span>
      <div class="match-types">
        {#if summary.matched.exact > 0}
          <span class="match-type exact">Exact: {summary.matched.exact}</span>
        {/if}
        {#if summary.matched.moved > 0}
          <span class="match-type moved">Moved: {summary.matched.moved}</span>
        {/if}
        {#if summary.matched.fuzzy > 0}
          <span class="match-type fuzzy">Fuzzy: {summary.matched.fuzzy}</span>
        {/if}
      </div>
    </div>
  {:else}
    <div class="no-summary">
      <span class="st-typography-label">No comparison data</span>
    </div>
  {/if}
</div>

<style>
  .comparison-summary {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sources {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .source {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .source-name {
    text-align: center;
    word-break: break-word;
  }

  .source-type {
    color: var(--st-gray-50);
    font-size: 12px;
  }

  .vs {
    color: var(--st-gray-50);
    font-size: 14px;
  }

  .statistics {
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
  }

  .stat-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .stat-label {
    color: var(--st-gray-60);
    font-size: 13px;
  }

  .stat-value {
    font-family: var(--st-font-mono);
    font-size: 13px;
    font-weight: 500;
  }

  .stat-row.added .stat-value {
    color: var(--st-green);
  }

  .stat-row.deleted .stat-value {
    color: var(--st-red);
  }

  .stat-row.modified .stat-value {
    color: var(--st-orange);
  }

  .stat-row.ambiguous .stat-value {
    color: var(--st-yellow);
  }

  .match-breakdown {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .match-types {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .match-type {
    background: var(--st-gray-10);
    border-radius: 4px;
    font-size: 12px;
    padding: 4px 8px;
  }

  .match-type.exact {
    background: rgba(0, 200, 83, 0.1);
    color: var(--st-green);
  }

  .match-type.moved {
    background: rgba(255, 165, 0, 0.1);
    color: var(--st-orange);
  }

  .match-type.fuzzy {
    background: rgba(255, 237, 72, 0.1);
    color: var(--st-yellow);
  }

  .no-summary {
    color: var(--st-gray-50);
    padding: 16px;
    text-align: center;
  }
</style>
