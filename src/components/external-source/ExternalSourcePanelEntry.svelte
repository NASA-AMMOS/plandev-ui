<svelte:options immutable={true} />

<script lang="ts">
  import { Eye, EyeOff } from 'lucide-svelte';
  import { get } from 'svelte/store';
  import { derivationGroupVisibilityMap, externalSources } from '../../stores/external-source';
  import { plan } from '../../stores/plan';
  import type { User } from '../../types/app';
  import type { DerivationGroup, ExternalSourceSlim } from '../../types/external-source';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import ExternalSourceDetails from './ExternalSourceDetails.svelte';

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
            <Eye size={16} />
          </button>
        {:else}
          <button
            class="st-button icon eye-button-closed"
            on:click|stopPropagation={onChange}
            use:tooltip={{ content: 'Hide in timeline', placement: 'top' }}
          >
            <EyeOff size={16} />
          </button>
        {/if}
      </div>
    </svelte:fragment>

    {#if relevantSources.length}
      {#each relevantSources as source (source.key)}
        <ExternalSourceDetails {source} {user} />
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
