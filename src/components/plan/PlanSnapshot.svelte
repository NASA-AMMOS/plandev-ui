<svelte:options immutable={true} />

<script lang="ts">
  import { Button, DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { EllipsisVertical } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { PlanSnapshot } from '../../types/plan-snapshot';
  import { getSimulationProgress, getSimulationStatus } from '../../utilities/simulation';
  import { tooltip } from '../../utilities/tooltip';
  import Card from '../ui/Card.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import Tag from '../ui/Tags/Tag.svelte';

  export let activePlanSnapshotId: PlanSnapshot['snapshot_id'] | null;
  export let maxVisibleTags: number = 4;
  export let planModelId: number = -1;
  export let planSnapshot: PlanSnapshot;

  let showMoreTags: boolean = false;
  let snapshotPreviewable: boolean = true;
  let disabledPreviewMessage: string = '';

  $: moreTagsAvailable = planSnapshot.tags.length > maxVisibleTags;
  $: visibleTags =
    moreTagsAvailable && showMoreTags
      ? planSnapshot.tags.map(tag => tag.tag)
      : planSnapshot.tags.map(tag => tag.tag).slice(0, maxVisibleTags);
  $: snapshotPreviewable = planModelId === planSnapshot.model_id;
  $: disabledPreviewMessage = !snapshotPreviewable
    ? `Snapshot can be restored but not previewed since plan snapshot's model (ID: ${planSnapshot.model_id}) does not match current plan's model (ID: ${planModelId})`
    : '';

  const dispatch = createEventDispatcher<{
    click: void;
    delete: void;
    restore: void;
  }>();

  function onShowMoreClick(event: MouseEvent) {
    event.stopPropagation();
    showMoreTags = !showMoreTags;
  }
</script>

<Card
  title={planSnapshot.snapshot_name}
  date={planSnapshot.taken_at}
  user={planSnapshot.taken_by || 'Unknown'}
  selected={planSnapshot.snapshot_id === activePlanSnapshotId}
  body={planSnapshot.description}
  on:click={() => dispatch('click')}
  interactable={snapshotPreviewable}
>
  <div slot="right">
    <div class="plan-snapshot--right-content">
      <StatusBadge
        prefix="Latest Relevant Simulation: "
        status={getSimulationStatus(planSnapshot.simulation)}
        progress={getSimulationProgress(planSnapshot.simulation)}
      />
      <div class="plan-snapshot--menu-button">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild let:builder>
            <Button variant="outline" size="icon" builders={[builder]} on:click={e => e.stopPropagation()}>
              <EllipsisVertical size={20} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="" align="start">
            <div use:tooltip={{ content: disabledPreviewMessage }}>
              <DropdownMenu.Item disabled={!snapshotPreviewable} size="sm" on:click={() => dispatch('click')}>
                Preview
              </DropdownMenu.Item>
            </div>
            <DropdownMenu.Item size="sm" on:click={() => dispatch('restore')}>Restore</DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item disabled size="sm" on:click={() => () => dispatch('delete')}>Delete</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>
  </div>
  <div class="plan-snapshot--tags">
    {#each visibleTags as tag (tag.id)}
      <Tag {tag} removable={false} />
    {/each}
    {#if moreTagsAvailable}
      <button class="st-button tertiary plan-snapshot--tags-show-more" on:click={onShowMoreClick}>
        {#if showMoreTags}
          Show less
        {:else}
          +{planSnapshot.tags.length - maxVisibleTags} more
        {/if}
      </button>
    {/if}
  </div>
  {#if !snapshotPreviewable}
    <div class="st-typography-label message" use:tooltip={{ content: disabledPreviewMessage }}>
      <WarningIcon class="red-icon" />Model Differs
    </div>
  {/if}
</Card>

<style>
  .plan-snapshot--right-content {
    --aerie-menu-item-template-columns: auto;
    --aerie-menu-item-line-height: 1rem;
    --aerie-menu-item-font-size: 12px;
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .plan-snapshot--menu-button {
    position: relative;
  }

  .plan-snapshot--tags {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 2px;
    margin: 0;
    margin-top: 4px;
    padding: 0;
  }

  .plan-snapshot--tags-show-more {
    color: var(--st-gray-60);
    height: 20px;
    margin-left: 4px;
    padding: 0px 0px;
  }

  .plan-snapshot--tags-show-more:hover {
    background: unset;
    color: var(--st-gray-100);
  }

  .message {
    background: #fff4f4;
    border: 1px solid var(--st-error-red);
    border-radius: 24px;
    color: var(--st-error-red);
    display: flex;
    flex: 0;
    gap: 4px;
    padding: 4px 8px;
    white-space: nowrap;
    width: min-content;
  }
</style>
