<svelte:options immutable={true} />

<script lang="ts">
  import Eye from 'bootstrap-icons/icons/eye-fill.svg?component';
  import EyeSlash from 'bootstrap-icons/icons/eye-slash.svg?component';
  import { get } from 'svelte/store';
  import { derivationGroupVisibilityMap, externalSources } from '../../stores/external-source';
  import { plan } from '../../stores/plan';
  import { plugins } from '../../stores/plugins';
  import type { User } from '../../types/app';
  import type { DerivationGroup, ExternalSourceSlim } from '../../types/external-source';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { formatDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';

  export let derivationGroup: DerivationGroup;
  export let user: User | null;

  let relevantSources: ExternalSourceSlim[] = [];
  let enabled: boolean = false;
  let hasDeletePermission: boolean = false;

  $: hasDeletePermission = featurePermissions.derivationGroup.canDelete(user, derivationGroup);
  $: enabled = $derivationGroupVisibilityMap[derivationGroup.name] ?? true;
  $: relevantSources = $externalSources.filter(source => derivationGroup.name === source.derivation_group_name);

  function onChange() {
    derivationGroupVisibilityMap.set({
      ...get(derivationGroupVisibilityMap),
      [derivationGroup.name]: !enabled,
    });
  }

  async function deleteEmptyDerivationGroup() {
    if (enabled) {
      // Delete plan derivation group association
      await effects.deleteDerivationGroupForPlan(derivationGroup.name, $plan, user);
    }
    // Delete the derivation group itself
    await effects.deleteDerivationGroup([derivationGroup], user);
  }
</script>

<div class="external-source-pairing">
  <Collapse
    title={derivationGroup.name}
    tooltipContent={'Derivation group ' + derivationGroup.name}
    defaultExpanded={false}
  >
    <svelte:fragment slot="right">
      <div class="derivation-group-collapse-details">
        <p class="derived-event-text">
          {derivationGroup.derived_event_total} derived events
        </p>
        {#if enabled === true}
          <button
            class="st-button icon eye-button-open"
            on:click|stopPropagation={onChange}
            use:tooltip={{ content: 'Show in timeline', placement: 'top' }}
          >
            <Eye />
          </button>
        {:else}
          <button
            class="st-button icon eye-button-closed"
            on:click|stopPropagation={onChange}
            use:tooltip={{ content: 'Hide in timeline', placement: 'top' }}
          >
            <EyeSlash />
          </button>
        {/if}
      </div>
    </svelte:fragment>

    {#if relevantSources.length}
      {#each relevantSources as source}
        <!-- Collapsible details -->
        <Collapse title={source.key} tooltipContent={source.key} defaultExpanded={false}>
          <svelte:fragment slot="right">
            <p class="st-typography-body derived-event-count">
              {derivationGroup.sources.get(source.key)?.event_counts} events
            </p>
          </svelte:fragment>
          <div class="st-typography-body">
            <div class="st-typography-bold">Key:</div>
            {source.key}
          </div>

          <div class="st-typography-body">
            <div class="st-typography-bold">Source Type:</div>
            {source.source_type_name}
          </div>

          <div class="st-typography-body">
            <div class="st-typography-bold">Start Time:</div>
            {formatDate(new Date(source.start_time), $plugins.time.primary.format)}
          </div>

          <div class="st-typography-body">
            <div class="st-typography-bold">End Time:</div>
            {formatDate(new Date(source.end_time), $plugins.time.primary.format)}
          </div>

          <div class="st-typography-body">
            <div class="st-typography-bold">Valid At:</div>
            {formatDate(new Date(source.valid_at), $plugins.time.primary.format)}
          </div>

          <div class="st-typography-body">
            <div class="st-typography-bold">Created At:</div>
            {formatDate(new Date(source.created_at), $plugins.time.primary.format)}
          </div>
        </Collapse>
      {/each}
    {:else}
      <p class="st-typography-body">No sources in this group.</p>
      <button
        name="delete-dg"
        class="st-button secondary"
        on:click|stopPropagation={deleteEmptyDerivationGroup}
        use:permissionHandler={{
          hasPermission: hasDeletePermission,
        }}
      >
        Delete Empty Derivation Group
      </button>
    {/if}
  </Collapse>
</div>

<style>
  .derived-event-text {
    align-items: center;
    color: var(--st-gray-60);
    display: flex;
    height: 100%;
    padding-right: 0.25rem;
    text-wrap: nowrap;
  }

  .derived-event-count {
    color: var(--st-gray-60);
  }

  .derivation-group-collapse-details {
    display: flex;
  }

  .eye-button-open {
    color: var(--st-gray-100);
  }

  .eye-button-closed {
    color: var(--st-gray-30);
  }
</style>
