<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import ChevronRightIcon from '@nasa-jpl/stellar/icons/chevron_right.svg?component';
  import PhoenixIcon from '../../assets/aerie-phoenix-logo.svg?component';
  import Nav from '../../components/app/Nav.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import { workspaces } from '../../stores/workspaces';
  import type { Workspace } from '../../types/workspace';
  import { getWorkspacesUrl } from '../../utilities/routes';
  import { getSearchParameterNumber } from '../../utilities/url';
  import type { PageData } from './$types';

  export let data: PageData;

  let workspaceId: number | null = null;
  let workspace: Workspace | undefined = undefined;

  function extractWorkspaceIdFromPath(pathname: string): number | null {
    // Matches /workspaces/123 or /workspaces/123/...
    const match = pathname.match(/\/workspaces\/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  $: {
    // Try to get from search params first
    workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID, $page.url.searchParams);
    // If not found, try to extract from path
    if (workspaceId == null || isNaN(workspaceId)) {
      workspaceId = extractWorkspaceIdFromPath($page.url.pathname);
    }
    workspace = $workspaces.find(workspace => workspace.id === workspaceId);
  }
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav user={data.user}>
    <div class="sequencing-title" slot="title">
      <a class="app-icon link flex flex-nowrap" href={getWorkspacesUrl(base)}>
        <PhoenixIcon height={16} />Sequence Workspaces
      </a>
      {#if workspace}
        <span class="icon-wrapper">
          <ChevronRightIcon />
        </span>
        {workspace.name}
      {/if}
    </div>
  </Nav>

  <slot />
</CssGrid>

<style>
  .sequencing-title {
    align-items: center;
    display: flex;
    gap: 6px;
  }

  .icon-wrapper {
    display: flex;
    gap: 2px;
  }

  .icon-wrapper :global(svg) {
    opacity: 0.5;
  }
</style>
