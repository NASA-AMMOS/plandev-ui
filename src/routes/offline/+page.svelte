<svelte:options immutable={true} />

<script lang="ts">
  import { get } from 'svelte/store';
  import TimelinePanel from '../../components/timeline/TimelinePanel.svelte';
  import { activityDirectivesDB } from '../../stores/activities';
  import { clearOfflineBundle, offlineMode, setOfflineBundle } from '../../stores/offline';
  import { initialPlan, maxTimeRange, planModelActivityTypes, planReadOnlyOffline, viewTimeRange } from '../../stores/plan';
  import {
    initialSpansLoading,
    resourceTypes,
    resourceTypesLoading,
    simulation,
    simulationDataset,
    simulationDatasetId,
    spans,
  } from '../../stores/simulation';
  import { initializeView } from '../../stores/views';
  import { OfflineBundleError } from '../../types/offline-bundle';
  import { loadOfflineBundle } from '../../utilities/offline-bundle';
  import { toOfflinePlanData, type OfflinePlanData } from './offline-data';

  let fileInput: HTMLInputElement;
  let errorMessage: string | null = null;
  let errorDetails: string[] = [];
  let planData: OfflinePlanData | null = null;

  async function onFileChange(event: Event) {
    errorMessage = null;
    errorDetails = [];

    const files = (event.target as HTMLInputElement).files;
    const file = files?.[0];
    if (!file) {
      return;
    }

    try {
      const text: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const loaded = loadOfflineBundle(text);

      // Hydrate the read-only stores the real timeline (TimelinePanel -> Timeline
      // -> Row -> layers) reads. These are plain writables, or `updateValue`/direct
      // sets on a `gqlSubscribable` (which, now that offline mode is active --
      // see stores/offlineFlag.ts -- only pushes a local value to existing
      // subscribers and never opens a network connection).
      setOfflineBundle(loaded);
      const data = toOfflinePlanData(loaded);
      planData = data;

      initialPlan.set(data.plan);
      activityDirectivesDB.updateValue(() => loaded.activityDirectives);
      spans.set(data.spans);
      resourceTypes.set(data.resourceTypes);
      resourceTypesLoading.set(false);
      initialSpansLoading.set(false);
      planModelActivityTypes.updateValue(() => loaded.activityTypes);
      simulationDatasetId.set(data.simulationDataset.id);
      simulation.updateValue(() => data.simulation);
      simulationDataset.updateValue(() => data.simulationDataset);
      // `maxTimeRange` is derived from `initialPlan` (already set above) and
      // updates synchronously, so this reads the plan's freshly computed bounds.
      viewTimeRange.set(get(maxTimeRange));
      initializeView(data.view);
      planReadOnlyOffline.set(true);
    } catch (e) {
      if (e instanceof OfflineBundleError) {
        errorMessage = e.message.split('\n')[0];
        errorDetails = e.details;
      } else {
        errorMessage = (e as Error).message ?? 'Unable to load offline bundle';
      }
      planData = null;
    }
  }

  function reset() {
    clearOfflineBundle();
    initialPlan.set(null);
    activityDirectivesDB.updateValue(() => []);
    spans.set(null);
    resourceTypes.set([]);
    planModelActivityTypes.updateValue(() => []);
    simulationDatasetId.set(-1);
    simulation.updateValue(() => null);
    simulationDataset.updateValue(() => null);
    viewTimeRange.set({ end: 0, start: 0 });
    planReadOnlyOffline.set(false);
    planData = null;
    errorMessage = null;
    errorDetails = [];
    if (fileInput) {
      fileInput.value = '';
    }
  }
</script>

<svelte:head>
  <title>Offline Plan Viewer</title>
</svelte:head>

<div class="offline-page">
  <header class="offline-header">
    <h1 class="st-typography-header">Offline Plan Viewer</h1>
    {#if $offlineMode}
      <button class="st-button secondary" on:click={reset}>Load a Different Bundle</button>
    {/if}
  </header>

  {#if !$offlineMode}
    <section class="upload-section">
      <p>Upload an offline bundle JSON file to view a plan and its simulation results with no backend connection.</p>
      <fieldset>
        <label for="bundle-file">Offline Bundle JSON File</label>
        <input
          bind:this={fileInput}
          id="bundle-file"
          class="upload w-full"
          class:error={!!errorMessage}
          name="bundle-file"
          type="file"
          accept="application/json"
          on:change={onFileChange}
        />
      </fieldset>
      {#if errorMessage}
        <div class="error-panel">
          <p class="error-message">{errorMessage}</p>
          {#if errorDetails.length}
            <ul>
              {#each errorDetails as detail}
                <li>{detail}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </section>
  {:else if planData}
    <section class="plan-summary">
      <h2 class="st-typography-medium-header">{planData.plan.name}</h2>
      <div class="plan-meta">
        <span>Start: {planData.plan.start_time}</span>
        <span>Duration: {planData.plan.duration}</span>
        <span>{planData.activityDirectives.length} activities</span>
        <span>{planData.spans.length} spans</span>
      </div>
    </section>

    <section class="offline-timeline-panel">
      <TimelinePanel user={null} />
    </section>
  {/if}
</div>

<style>
  .offline-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    overflow: auto;
    padding: 16px 24px;
  }

  .offline-header {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .upload-section fieldset {
    border: none;
    margin: 16px 0;
    padding: 0;
  }

  .upload {
    margin-top: 8px;
  }

  .error {
    background-color: var(--st-input-error-background-color);
    border: 1px solid var(--st-red);
  }

  .error-panel {
    background: var(--st-gray-10);
    border: 1px solid var(--st-red);
    border-radius: 4px;
    color: var(--st-red);
    margin-top: 12px;
    padding: 8px 12px;
  }

  .error-message {
    font-weight: 600;
    margin: 0;
  }

  .plan-meta {
    display: flex;
    gap: 16px;
  }

  .offline-timeline-panel {
    display: flex;
    flex: 1;
    min-height: 0;
  }
</style>
