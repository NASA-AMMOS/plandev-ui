<svelte:options immutable={true} />

<script lang="ts">
  import {
    comparisonLeftActivities,
    comparisonLeftDuration,
    comparisonLeftSource,
    comparisonLeftStartTime,
    comparisonRightActivities,
    comparisonRightSource,
    comparisonSummary,
    filteredComparisonResults,
    selectedComparisonActivityId,
    selectedComparisonResult,
    showOnlyChanges,
  } from '../../stores/planComparison';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import PlanComparisonActivityDetail from './PlanComparisonActivityDetail.svelte';
  import PlanComparisonActivityList from './PlanComparisonActivityList.svelte';
  import PlanComparisonSummary from './PlanComparisonSummary.svelte';
  import PlanComparisonTimeline from './PlanComparisonTimeline.svelte';

  type ViewMode = 'list' | 'timeline';
  let viewMode: ViewMode = 'list';

  let comparisonLeftDiv: HTMLElement | null = null;
  let comparisonRightDiv: HTMLElement | null = null;
  let comparisonScrollOrigin: 'left' | 'right' | null = null;

  function handleActivitySelect(event: CustomEvent<{ activityId: number }>) {
    selectedComparisonActivityId.set(event.detail.activityId);
  }

  function onComparisonScroll(event: Event, origin: 'left' | 'right') {
    if (comparisonScrollOrigin === origin) {
      const target = event.target as HTMLDivElement;
      const scrollTop = target.scrollTop;
      if (origin === 'left' && comparisonRightDiv !== null) {
        comparisonRightDiv.scrollTop = scrollTop;
      } else if (comparisonLeftDiv !== null) {
        comparisonLeftDiv.scrollTop = scrollTop;
      }
    }
    comparisonScrollOrigin = origin;
  }

  function setScrollOrigin(origin: 'left' | 'right') {
    comparisonScrollOrigin = origin;
  }

  $: selectedResult = $selectedComparisonResult;
</script>

<div class="plan-comparison-view">
  <!-- View mode tabs -->
  <div class="view-mode-tabs">
    <button
      class="view-mode-tab"
      class:active={viewMode === 'list'}
      on:click={() => (viewMode = 'list')}
    >
      List View
    </button>
    <button
      class="view-mode-tab"
      class:active={viewMode === 'timeline'}
      on:click={() => (viewMode = 'timeline')}
    >
      Timeline View
    </button>
  </div>

  {#if viewMode === 'list'}
    <CssGrid columns="0.5fr 3px 1fr 3px 1fr 3px 1fr">
      <!-- Column 0: Summary -->
      <div class="comparison-summary-column">
        <PlanComparisonSummary
          leftSource={$comparisonLeftSource}
          rightSource={$comparisonRightSource}
          summary={$comparisonSummary}
        />
        <div class="filter-controls">
          <label class="st-checkbox">
            <input
              type="checkbox"
              bind:checked={$showOnlyChanges}
            />
            <span>Show changes only</span>
          </label>
        </div>
      </div>

      <CssGridGutter />

      <!-- Column 2: Activity list -->
      <div class="comparison-activity-list">
        <PlanComparisonActivityList
          results={$filteredComparisonResults}
          selectedActivityId={$selectedComparisonActivityId}
          on:select={handleActivitySelect}
        />
      </div>

      <CssGridGutter />

      <!-- Column 4: Left activity detail -->
      <div
        class="comparison-detail-column"
        bind:this={comparisonLeftDiv}
        on:mouseenter={() => setScrollOrigin('left')}
        on:scroll={(e) => onComparisonScroll(e, 'left')}
        role="region"
        aria-label="Left activity details"
      >
        {#if selectedResult}
          <div class="detail-header">
            <span class="st-typography-medium">{$comparisonLeftSource?.name ?? 'Left'}</span>
          </div>
          <PlanComparisonActivityDetail
            activity={selectedResult.changeType === 'matched' ? selectedResult.leftActivity : selectedResult.changeType === 'deleted' ? selectedResult.activity : null}
            changedFields={selectedResult.changeType === 'matched' ? selectedResult.changedFields : []}
            side="left"
          />
        {:else}
          <div class="empty-detail">
            <span class="st-typography-label">Select an activity to view details</span>
          </div>
        {/if}
      </div>

      <CssGridGutter />

      <!-- Column 6: Right activity detail -->
      <div
        class="comparison-detail-column"
        bind:this={comparisonRightDiv}
        on:mouseenter={() => setScrollOrigin('right')}
        on:scroll={(e) => onComparisonScroll(e, 'right')}
        role="region"
        aria-label="Right activity details"
      >
        {#if selectedResult}
          <div class="detail-header">
            <span class="st-typography-medium">{$comparisonRightSource?.name ?? 'Right'}</span>
          </div>
          <PlanComparisonActivityDetail
            activity={selectedResult.changeType === 'matched' ? selectedResult.rightActivity : selectedResult.changeType === 'added' ? selectedResult.activity : null}
            changedFields={selectedResult.changeType === 'matched' ? selectedResult.changedFields : []}
            side="right"
          />
        {:else}
          <div class="empty-detail">
            <span class="st-typography-label">Select an activity to view details</span>
          </div>
        {/if}
      </div>
    </CssGrid>
  {:else}
    <PlanComparisonTimeline
      leftSource={$comparisonLeftSource}
      rightSource={$comparisonRightSource}
      leftActivities={$comparisonLeftActivities}
      rightActivities={$comparisonRightActivities}
      results={$filteredComparisonResults}
      planStartTime={$comparisonLeftStartTime}
      planDuration={$comparisonLeftDuration}
    />
  {/if}
</div>

<style>
  .plan-comparison-view {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .plan-comparison-view :global(.css-grid) {
    flex: 1;
    min-height: 0;
  }

  .comparison-summary-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    padding: 16px;
  }

  .comparison-activity-list {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }

  .comparison-detail-column {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }

  .detail-header {
    background: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-20);
    padding: 8px 16px;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .empty-detail {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
    flex: 1;
    justify-content: center;
  }

  .filter-controls {
    border-top: 1px solid var(--st-gray-20);
    padding-top: 16px;
  }

  .st-checkbox {
    align-items: center;
    cursor: pointer;
    display: flex;
    gap: 8px;
  }

  .st-checkbox input {
    cursor: pointer;
  }

  .view-mode-tabs {
    background: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    gap: 4px;
    padding: 8px 16px;
  }

  .view-mode-tab {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--st-gray-60);
    cursor: pointer;
    font-size: 13px;
    padding: 6px 12px;
    transition: all 0.15s ease;
  }

  .view-mode-tab:hover {
    background: var(--st-gray-15);
    color: var(--st-gray-80);
  }

  .view-mode-tab.active {
    background: var(--st-white);
    border-color: var(--st-gray-20);
    color: var(--st-gray-90);
    font-weight: 500;
  }
</style>
