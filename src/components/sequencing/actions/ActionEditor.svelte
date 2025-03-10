<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { actionDefinitions, actionsColumns } from '../../../stores/actions';
  import { workspaces } from '../../../stores/sequencing';
  import type { ActionDefinition } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { Workspace } from '../../../types/sequencing';
  import { getSearchParameterNumber } from '../../../utilities/generic';
  import CssGrid from '../../ui/CssGrid.svelte';
  import CssGridGutter from '../../ui/CssGridGutter.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';

  export let actionDefinition: ActionDefinition | null;
  export let user: User | null;

  let workspace: Workspace | undefined;
  let workspaceId: number | null = null;

  $: workspace = $workspaces.find(workspace => workspace.id === workspaceId);

  onMount(() => {
    workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
  });
</script>

<CssGrid bind:columns={$actionsColumns} class="grid">
  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Edit Action</SectionTitle>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <div class="actions">
        {#each $actionDefinitions || [] as actionDefinition}
          <div class="action">
            <div class="action-name-row">
              <div class="st-typography-bold" style:flex={1}>{actionDefinition.name}</div>
              <button class="st-button secondary" on:click|stopPropagation={() => runAction(actionDefinition)}>
                Run
              </button>
            </div>
            <div class="st-typography-label">{actionDefinition.description}</div>
          </div>
        {/each}
      </div>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Action Bundle</SectionTitle>
    </svelte:fragment>
  </Panel>
</CssGrid>

<style>
  .code {
    border: 1px solid var(--st-gray-30);
    border-radius: 4px;
    height: 400px;
    overflow: hidden;
  }
</style>
