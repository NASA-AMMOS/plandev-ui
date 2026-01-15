<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import Nav from '../../components/app/Nav.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import { getWorkspacesUrl } from '../../utilities/routes';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav user={data.user}>
    <div class="workspace-title" slot="title">
      <a class="app-icon link flex flex-nowrap" href={getWorkspacesUrl(base)}> Sequence Workspaces </a>
    </div>
  </Nav>

  <slot />
</CssGrid>

<style>
  .workspace-title {
    align-items: center;
    display: flex;
    gap: 6px;
  }
</style>
