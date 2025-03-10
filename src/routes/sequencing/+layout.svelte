<svelte:options immutable={true} />

<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import PhoenixIcon from '../../assets/aerie-phoenix-logo.svg?component';
  import Nav from '../../components/app/Nav.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import { workspaces } from '../../stores/sequencing';
  import { getSearchParameterNumber } from '../../utilities/generic';
  import type { PageData } from './$types';

  export let data: PageData;

  let workspaceId: number | null = null;

  $: workspace = $workspaces.find(workspace => workspace.id === workspaceId);

  onMount(() => {
    workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
  });
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav user={data.user}>
    <div class="sequencing-title" slot="title">
      <a
        href={`/sequencing${workspace ? `?${SearchParameters.WORKSPACE_ID}=${workspace.id}` : ''}`}
        class="app-icon link"><PhoenixIcon height={16} />Phoenix Sequencing</a
      >
      {#if $page.url.pathname.indexOf('/sequencing/actions') > -1}
        <a
          class="link"
          href={`/sequencing/actions${workspace ? `?${SearchParameters.WORKSPACE_ID}=${workspace.id}` : ''}`}
        >
          / {workspace?.name ?? ''} Actions
        </a>
      {/if}
      {#if $page.url.pathname.indexOf('/sequencing/actions/runs') > -1}
        / Action Run
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
    /* opacity: 0.7; */
    text-decoration: none;
  }

  .link:hover {
    /* opacity: 1; */
  }
</style>
