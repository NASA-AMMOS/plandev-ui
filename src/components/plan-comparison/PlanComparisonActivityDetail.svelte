<svelte:options immutable={true} />

<script lang="ts">
  import type { ComparisonActivity } from '../../types/plan-comparison';
  import Highlight from '../ui/Highlight.svelte';

  export let activity: ComparisonActivity | null;
  export let changedFields: string[];
  export let side: 'left' | 'right';

  function isFieldChanged(fieldName: string): boolean {
    // Check for exact match or prefix match (e.g., 'arguments' matches 'arguments.biteSize')
    return changedFields.some(f => f === fieldName || f.startsWith(`${fieldName}.`));
  }

  function formatArguments(args: Record<string, unknown>): string {
    return JSON.stringify(args, null, 2);
  }

  function formatMetadata(metadata: Record<string, unknown>): string {
    return JSON.stringify(metadata, null, 2);
  }

  function formatTags(tags: { color: string | null; id: number; name: string }[]): string {
    return tags.map(t => t.name).join(', ') || 'None';
  }
</script>

<div class="activity-detail" class:empty={!activity}>
  {#if activity}
    <div class="detail-section">
      <Highlight highlight={isFieldChanged('name')}>
        <div class="detail-field">
          <span class="field-label">Name</span>
          <span class="field-value">{activity.name}</span>
        </div>
      </Highlight>

      <Highlight highlight={isFieldChanged('type')}>
        <div class="detail-field">
          <span class="field-label">Type</span>
          <span class="field-value">{activity.type}</span>
        </div>
      </Highlight>

      <Highlight highlight={isFieldChanged('start_offset')}>
        <div class="detail-field">
          <span class="field-label">Start Offset</span>
          <span class="field-value">{activity.start_offset}</span>
        </div>
      </Highlight>

      <Highlight highlight={isFieldChanged('anchor_id')}>
        <div class="detail-field">
          <span class="field-label">Anchor ID</span>
          <span class="field-value">{activity.anchor_id ?? 'None (Plan Start)'}</span>
        </div>
      </Highlight>

      <Highlight highlight={isFieldChanged('anchored_to_start')}>
        <div class="detail-field">
          <span class="field-label">Anchored To Start</span>
          <span class="field-value">{activity.anchored_to_start ? 'Yes' : 'No'}</span>
        </div>
      </Highlight>
    </div>

    <div class="detail-section">
      <Highlight highlight={isFieldChanged('arguments')}>
        <div class="detail-field">
          <span class="field-label">Arguments</span>
          <pre class="field-value code">{formatArguments(activity.arguments)}</pre>
        </div>
      </Highlight>
    </div>

    <div class="detail-section">
      <Highlight highlight={isFieldChanged('metadata')}>
        <div class="detail-field">
          <span class="field-label">Metadata</span>
          <pre class="field-value code">{formatMetadata(activity.metadata)}</pre>
        </div>
      </Highlight>
    </div>

    <div class="detail-section">
      <Highlight highlight={isFieldChanged('tags')}>
        <div class="detail-field">
          <span class="field-label">Tags</span>
          <span class="field-value">{formatTags(activity.tags)}</span>
        </div>
      </Highlight>
    </div>

    <div class="detail-section">
      <div class="detail-field">
        <span class="field-label">Activity ID</span>
        <span class="field-value id">{activity.id}</span>
      </div>
    </div>

  {:else}
    <div class="no-activity">
      <span class="st-typography-label">
        {#if side === 'left'}
          Activity does not exist in left source
        {:else}
          Activity does not exist in right source
        {/if}
      </span>
    </div>
  {/if}
</div>

<style>
  .activity-detail {
    display: flex;
    flex-direction: column;
    padding: 16px;
  }

  .activity-detail.empty {
    align-items: center;
    flex: 1;
    justify-content: center;
  }

  .detail-section {
    border-bottom: 1px solid var(--st-gray-15);
    margin-bottom: 12px;
    padding-bottom: 12px;
  }

  .detail-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .detail-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    color: var(--st-gray-50);
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .field-value {
    font-size: 14px;
    word-break: break-word;
  }

  .field-value.code {
    background: var(--st-gray-10);
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
    font-family: var(--st-font-mono);
    font-size: 12px;
    max-height: 200px;
    overflow: auto;
    padding: 8px;
    white-space: pre-wrap;
  }

  .field-value.id {
    color: var(--st-gray-50);
    font-family: var(--st-font-mono);
    font-size: 12px;
  }

  .no-activity {
    color: var(--st-gray-50);
    text-align: center;
  }
</style>
