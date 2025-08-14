<svelte:options immutable={true} />

<script lang="ts">
  import { page } from '$app/stores';
  import ChevronRightIcon from '@nasa-jpl/stellar/icons/chevron_right.svg?component';
  import PhoenixIcon from '../../assets/aerie-phoenix-logo.svg?component';
  import Nav from '../../components/app/Nav.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import { workspaces } from '../../stores/sequencing';
  import type { Workspace } from '../../types/sequencing';
  import { getSearchParameterNumber } from '../../utilities/generic';
  import type { PageData } from './$types';

  export let data: PageData;

  let workspaceId: number | null = null;
  let workspace: Workspace | undefined = undefined;

  $: workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID, $page.url.searchParams);
  $: workspace = $workspaces.find(workspace => workspace.id === workspaceId);
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav user={data.user}>
    <div class="sequencing-title" slot="title">
      <a
        href={`/sequencing${workspace ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`}
        class="app-icon link"
      >
        <PhoenixIcon height={16} />Phoenix Sequencing
      </a>
      {#if $page.url.pathname.indexOf('/sequencing/actions') > -1}
        <a
          class="link"
          href={`/sequencing/actions${workspace ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`}
        >
          <div class="icon-wrapper">
            <ChevronRightIcon />
            {workspace?.name ?? ''} Actions
          </div>
        </a>
      {/if}
      {#if $page.url.pathname.indexOf('/sequencing/actions/runs') > -1}
        <div class="icon-wrapper">
          <ChevronRightIcon /> Action Run
        </div>
      {/if}
    </div>
  </Nav>
  <slot />
</CssGrid>

<style>
  .app-icon {
    align-items: center;
    display: flex;
    justify-content: center;
  }
  .sequencing-title {
    align-items: center;
    display: flex;
    gap: 6px;
  }

  .link {
    color: var(--st-white);
    font-size: 14px;
    text-decoration: none;
  }

  .link:hover {
    opacity: 0.8;
  }

  .icon-wrapper {
    display: flex;
    gap: 2px;
  }

  .icon-wrapper :global(svg) {
    opacity: 0.5;
  }
</style>
