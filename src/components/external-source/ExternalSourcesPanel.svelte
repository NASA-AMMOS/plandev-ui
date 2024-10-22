<svelte:options immutable={true} />

<script lang="ts">
  import {
    derivationGroupPlanLinkError,
    derivationGroups,
    derivationGroupsAcknowledged,
    externalSources,
    planDerivationGroupLinks,
  } from '../../stores/external-source';
  import { plan } from '../../stores/plan';
  import type { User } from '../../types/app';
  import type { DerivationGroup, ExternalSourceSlim } from '../../types/external-source';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import CollapsibleListControls from '../CollapsibleListControls.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import AlertError from '../ui/AlertError.svelte';
  import CardList from '../ui/CardList.svelte';
  import Panel from '../ui/Panel.svelte';
  import ExternalSourcePanelEntry from './ExternalSourcePanelEntry.svelte';
  import ExternalSourceUpdateCard from './ExternalSourceUpdateCard.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  // filter which derivation groups are visible
  let filterText: string = '';
  let mappedDerivationGroups: { [key: string]: DerivationGroup[] } = {};
  let unseenSources: ExternalSourceSlim[] = [];
  let filteredDerivationGroups: DerivationGroup[] = [];

  // Determine which new and deleted sources are unacknowledged for the user
  $: {
    if ($plan !== null && $plan.id !== null) {
      // a mapping of derivation groups (that are associated with this plan) to the time their last update was last acknowledged
      const groups = Object.keys($derivationGroupsAcknowledged);
      unseenSources = $externalSources.filter(externalSource => {
        if (!groups.includes(externalSource.derivation_group_name)) {
          return false;
        }
        // check dates
        return (
          new Date(externalSource.created_at) >
          new Date($derivationGroupsAcknowledged[externalSource.derivation_group_name].last_acknowledged_at)
        );
      });
    }
  }

  $: linkedDerivationGroupNames = $planDerivationGroupLinks.map(
    planDerivationGroup => planDerivationGroup.derivation_group_name,
  );
  $: filteredDerivationGroups = $derivationGroups
    .filter(group => {
      if ($plan) {
        return linkedDerivationGroupNames.includes(group.name);
      } else {
        return false;
      }
    })
    .filter(group => {
      const filterTextLowerCase = filterText.toLowerCase();
      const includesName = group.name.toLocaleLowerCase().includes(filterTextLowerCase);
      return includesName;
    });
  $: if ($planDerivationGroupLinks) {
    mappedDerivationGroups = filteredDerivationGroups.reduce(
      (aggMappedDerivationGroups: { [key: string]: DerivationGroup[] }, group) => {
        if (
          aggMappedDerivationGroups[group.source_type_name] &&
          !aggMappedDerivationGroups[group.source_type_name]
            .map(mappedDerivationGroup => mappedDerivationGroup.name)
            .includes(group.name)
        ) {
          // use string later for source type
          aggMappedDerivationGroups[group.source_type_name]?.push(group);
        } else {
          aggMappedDerivationGroups[group.source_type_name] = [group];
        }
        return aggMappedDerivationGroups;
      },
      {},
    );
  }
  $: filteredDerivationGroups.forEach(group => {
    // ...and repopulate it every time the links change. this handles deletion correctly
    if (group.source_type_name) {
      if (
        mappedDerivationGroups[group.source_type_name] &&
        !mappedDerivationGroups[group.source_type_name]
          .map(mappedDerivationGroup => mappedDerivationGroup.name)
          .includes(group.name)
      ) {
        // use string later for source type
        mappedDerivationGroups[group.source_type_name]?.push(group);
      } else {
        mappedDerivationGroups[group.source_type_name] = [group];
      }
    }
  });

  function onManageDerivationGroups() {
    effects.managePlanDerivationGroups(user);
  }

  function onUpdateDismiss() {
    for (const derivationGroup of filteredDerivationGroups) {
      effects.updateDerivationGroupAcknowledged($plan ?? undefined, derivationGroup.name, user);
    }
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="External Sources" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <CollapsibleListControls
      placeholder="Filter External Sources"
      on:input={event => (filterText = event.detail.value)}
    >
      <svelte:fragment slot="right">
        <button
          name="manage-derivation-groups"
          class="st-button active"
          on:click|stopPropagation={onManageDerivationGroups}
          use:tooltip={{ content: 'Select derivation groups to associate with this plan', placement: 'top' }}
        >
          Manage Derivation Groups
        </button>
      </svelte:fragment>
    </CollapsibleListControls>

    <AlertError class="m-2" error={$derivationGroupPlanLinkError} />

    {#if unseenSources.length}
      <div style="padding-top: 10px">
        <CardList>
          {#if unseenSources.length}
            <ExternalSourceUpdateCard {user} deleted={false} sources={unseenSources} on:dismiss={onUpdateDismiss} />
          {/if}
        </CardList>
      </div>
    {/if}

    {#if filteredDerivationGroups.length}
      {#each Object.keys(mappedDerivationGroups) as sourceType}
        <Collapse title={sourceType.toString()} tooltipContent={sourceType.toString()} defaultExpanded={true}>
          {#if mappedDerivationGroups[sourceType]}
            {#each mappedDerivationGroups[sourceType] as group}
              <ExternalSourcePanelEntry derivationGroup={group} {user} />
            {/each}
          {/if}
        </Collapse>
      {/each}
    {:else}
      <div class="st-typography-body">
        <p class="no-derivation-groups-linked">No Derivation Groups Linked To This Plan</p>
      </div>
      <div class="st-typography-body">
        <p>
          <br />
          <i>Click "Manage Derivation Groups" to associate Derivation Groups to this plan.</i>
        </p>
      </div>
    {/if}
  </svelte:fragment>
</Panel>

<style>
  .no-derivation-groups-linked {
    padding-top: 12px;
  }
  .st-button {
    white-space: nowrap;
  }
</style>
