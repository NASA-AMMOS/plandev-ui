<script lang="ts">
  // NOTE: this does NOT refresh/clear/reset if the database is cleared or restarted! So stuff from the old database just lingers around...to clear it, just press dismiss

  import LightningChargeIcon from 'bootstrap-icons/icons/lightning-charge.svg?component';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { plan } from '../../stores/plan';
  import type { User } from '../../types/app';
  import type { ExternalSourceSlim } from '../../types/external-source';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getTimeAgo } from '../../utilities/time';
  import Collapse from '../Collapse.svelte';

  export let deleted: boolean = false;
  export let sources: ExternalSourceSlim[] = [];
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    dismiss: void;
  }>();

  let mappedSources: { [sourceType: string]: { [derivationGroup: string]: ExternalSourceSlim[] } } = {};
  let hasUpdatePermission: boolean = false;

  $: if ($plan !== null) {
    hasUpdatePermission = featurePermissions.derivationGroupAcknowledgement.canUpdate(user, $plan);
  }

  $: sources.forEach(source => {
    let sourceType = source.source_type_name;
    let derivationGroup = source.derivation_group_name;
    if (sourceType && derivationGroup) {
      if (mappedSources[sourceType] && mappedSources[sourceType][derivationGroup]) {
        mappedSources[sourceType][derivationGroup]?.push(source);
      } else if (mappedSources[sourceType] && !mappedSources[sourceType][derivationGroup]) {
        mappedSources[sourceType][derivationGroup] = [source];
      } else if (!mappedSources[sourceType]) {
        mappedSources[sourceType] = { [derivationGroup]: [source] };
      }
    }
  });
</script>

<div class="card st-typography-label" class:card-border-deleted={deleted} class:card-border-added={!deleted}>
  <div class="card-row card-title-row" class:card-background-deleted={deleted} class:card-background-added={!deleted}>
    <div class="card-title st-typography-medium">
      <div class:card-icon-deleted={deleted} class:card-icon-added={!deleted}>
        <LightningChargeIcon class="filter-search-icon" />
      </div>
      {#if sources.length === 1 && !deleted}
        1 new file has been uploaded
      {:else if sources.length === 1 && deleted}
        1 file has been deleted
      {:else if deleted}
        {sources.length} files have been deleted
      {:else}
        {sources.length} new files have been uploaded
      {/if}
    </div>
    <slot name="right">
      <button class="st-button icon fs-6" on:click={() => dispatch('dismiss')}>
        <XIcon />
      </button>
    </slot>
  </div>
  <div class="card-source-content">
    <div class="card-row">
      <span class="st-typography-body">
        {!deleted
          ? 'New files matching source types and derivation groups in the current plan:'
          : 'Deleted files organized by source type and derivation group:'}
      </span>
    </div>
    <div class="card-body st-typography-body">
      {#each Object.keys(mappedSources) as sourceType}
        <Collapse title={sourceType} tooltipContent="Source Type" defaultExpanded={true}>
          {#each Object.keys(mappedSources[sourceType]) as derivationGroup}
            <Collapse title={derivationGroup} tooltipContent="Derivation Group" defaultExpanded={true}>
              {#each mappedSources[sourceType][derivationGroup] as source}
                <div class="card-source-info">
                  <p class="card-source-key">{source.key}</p>
                  <p class="card-time">
                    {getTimeAgo(new Date(source.created_at), new Date(), Number.MAX_SAFE_INTEGER)}
                  </p>
                </div>
              {/each}
            </Collapse>
          {/each}
        </Collapse>
      {/each}
    </div>
    <div class="card-dismiss">
      <button
        class="st-button secondary hover-fix"
        on:click={() => dispatch('dismiss')}
        use:permissionHandler={{
          hasPermission: hasUpdatePermission,
          permissionError: 'You do not have permission to acknowledge this external source.',
        }}
      >
        Dismiss
      </button>
    </div>
    <slot />
  </div>
</div>

<style>
  .card {
    background: var(--bg-color, rgba(245, 245, 245, 0.35));
    border: 1px solid var(--border-color, rgba(152, 101, 35, 0.5));
    border-radius: 4px;
    color: var(--st-gray-70);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    text-align: left;
  }

  .card-dismiss {
    padding-top: 4px;
  }

  .card-dismiss > button {
    border: 0px;
    width: 100px;
  }

  .card-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    min-height: 24px;
    padding-top: 4px;
    width: 100%;
  }

  .card-title-row {
    background: var(--title-bg-color, rgb(254, 252, 234));
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    padding: 4px 0px;
  }

  .card-title {
    align-items: center;
    color: var(--st-gray-80);
    display: flex;
    gap: 5px;
    line-height: 24px;
    padding-left: 5px;
    width: 100%;
  }

  .card-body {
    color: var(--st-gray-70);
    padding: 4px 0px;
  }

  .card-source-content {
    padding: 4px 12px 12px;
  }

  .card-source-info {
    display: flex;
    justify-content: space-between;
    overflow: hidden;
    white-space: nowrap;
  }

  .card-source-key {
    flex-shrink: 1;
    max-width: 100%;
    overflow: auto;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-time {
    color: grey;
    flex-shrink: 0;
    margin-left: auto;
    white-space: nowrap;
  }

  .hover-fix {
    background-color: var(--st-gray-20);
  }

  .hover-fix:hover {
    background-color: var(--st-gray-30);
  }

  .card-background-added {
    background: rgb(254, 252, 234);
    display: flex;
  }

  .card-background-deleted {
    background: rgb(254, 234, 234);
    display: flex;
  }

  .card-icon-added {
    color: rgba(152, 101, 35, 0.5);
  }

  .card-icon-deleted {
    color: rgba(152, 35, 35, 0.5);
  }

  .card-border-added {
    border-color: rgba(152, 101, 35, 0.5);
  }

  .card-border-deleted {
    border-color: rgba(152, 35, 35, 0.5);
  }
</style>
