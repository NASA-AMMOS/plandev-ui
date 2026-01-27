<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import {
    comparisonLeftActivities,
    comparisonLeftDuration,
    comparisonLeftSimulationDataset,
    comparisonLeftSource,
    comparisonLeftStartTime,
    comparisonResourceTypes,
    comparisonRightActivities,
    comparisonRightSimulationDataset,
    comparisonRightSource,
    comparisonSummary,
    filteredComparisonResults,
    selectedComparisonActivityId,
    selectedComparisonResult,
    showOnlyChanges,
  } from '../../stores/planComparison';
  import type { User } from '../../types/app';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import PlanComparisonActivityDetail from './PlanComparisonActivityDetail.svelte';
  import PlanComparisonActivityList from './PlanComparisonActivityList.svelte';
  import PlanComparisonSummary from './PlanComparisonSummary.svelte';
  import PlanComparisonTimeline from './PlanComparisonTimeline.svelte';

  export let user: User | null = null;

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

<Tabs.Root value="list" class="flex h-full flex-col">
  <Tabs.List
    class="flex h-[36px] shrink-0 items-center justify-start rounded-none border-b border-border bg-secondary/50 px-1 py-0"
  >
    <Tabs.Trigger
      value="list"
      class="h-6 border bg-transparent px-2 text-xs data-[state=active]:border data-[state=inactive]:border-transparent"
    >
      List View
    </Tabs.Trigger>
    <Tabs.Trigger
      value="timeline"
      class="h-6 border bg-transparent px-2 text-xs data-[state=active]:border data-[state=inactive]:border-transparent"
    >
      Timeline View
    </Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="list" class="flex-1 overflow-hidden">
    <CssGrid columns="0.5fr 3px 1fr 3px 1fr 3px 1fr" rows="1fr" class="h-full overflow-hidden">
      <!-- Column 0: Summary -->
      <div class="flex flex-col gap-4 overflow-y-auto p-4">
        <PlanComparisonSummary
          leftSource={$comparisonLeftSource}
          rightSource={$comparisonRightSource}
          summary={$comparisonSummary}
        />
        <div class="border-t border-border pt-4">
          <label class="flex cursor-pointer items-center gap-2">
            <input type="checkbox" bind:checked={$showOnlyChanges} class="cursor-pointer" />
            <span>Show changes only</span>
          </label>
        </div>
      </div>

      <CssGridGutter track={1} />

      <!-- Column 2: Activity list -->
      <div class="flex min-h-0 flex-col overflow-hidden">
        <PlanComparisonActivityList
          results={$filteredComparisonResults}
          selectedActivityId={$selectedComparisonActivityId}
          on:select={handleActivitySelect}
        />
      </div>

      <CssGridGutter track={3} />

      <!-- Column 4: Left activity detail -->
      <div
        class="flex min-h-0 flex-col overflow-y-auto"
        bind:this={comparisonLeftDiv}
        on:mouseenter={() => setScrollOrigin('left')}
        on:scroll={e => onComparisonScroll(e, 'left')}
        role="region"
        aria-label="Left activity details"
      >
        {#if selectedResult}
          {#key $selectedComparisonActivityId}
            <div class="sticky top-0 z-10 border-b border-border bg-muted px-4 py-2">
              <span class="font-medium">{$comparisonLeftSource?.name ?? 'Left'}</span>
            </div>
            <PlanComparisonActivityDetail
              activity={selectedResult.changeType === 'matched'
                ? selectedResult.leftActivity
                : selectedResult.changeType === 'deleted'
                  ? selectedResult.activity
                  : null}
              changedFields={selectedResult.changeType === 'matched' ? selectedResult.changedFields : []}
              side="left"
            />
          {/key}
        {:else}
          <div class="flex flex-1 items-center justify-center text-muted-foreground">
            <span class="text-sm">Select an activity to view details</span>
          </div>
        {/if}
      </div>

      <CssGridGutter track={5} />

      <!-- Column 6: Right activity detail -->
      <div
        class="flex min-h-0 flex-col overflow-y-auto"
        bind:this={comparisonRightDiv}
        on:mouseenter={() => setScrollOrigin('right')}
        on:scroll={e => onComparisonScroll(e, 'right')}
        role="region"
        aria-label="Right activity details"
      >
        {#if selectedResult}
          {#key $selectedComparisonActivityId}
            <div class="sticky top-0 z-10 border-b border-border bg-muted px-4 py-2">
              <span class="font-medium">{$comparisonRightSource?.name ?? 'Right'}</span>
            </div>
            <PlanComparisonActivityDetail
              activity={selectedResult.changeType === 'matched'
                ? selectedResult.rightActivity
                : selectedResult.changeType === 'added'
                  ? selectedResult.activity
                  : null}
              changedFields={selectedResult.changeType === 'matched' ? selectedResult.changedFields : []}
              side="right"
            />
          {/key}
        {:else}
          <div class="flex flex-1 items-center justify-center text-muted-foreground">
            <span class="text-sm">Select an activity to view details</span>
          </div>
        {/if}
      </div>
    </CssGrid>
  </Tabs.Content>

  <Tabs.Content value="timeline" class="flex-1 overflow-hidden">
    <PlanComparisonTimeline
      leftSource={$comparisonLeftSource}
      rightSource={$comparisonRightSource}
      leftActivities={$comparisonLeftActivities}
      rightActivities={$comparisonRightActivities}
      leftSimulationDataset={$comparisonLeftSimulationDataset}
      rightSimulationDataset={$comparisonRightSimulationDataset}
      results={$filteredComparisonResults}
      planStartTime={$comparisonLeftStartTime}
      planDuration={$comparisonLeftDuration}
      resourceTypes={$comparisonResourceTypes}
      {user}
    />
  </Tabs.Content>
</Tabs.Root>
