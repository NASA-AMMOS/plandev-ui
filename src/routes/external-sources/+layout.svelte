<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import TagIcon from '@nasa-jpl/stellar/icons/tag.svg?component';
  import ExternalSourceIcon from '../../assets/external-source-box.svg?component';
  import Nav from '../../components/app/Nav.svelte';
  import NavButton from '../../components/app/NavButton.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import type { LayoutData } from './$types';

  export let data: LayoutData;
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav user={data.user}>
    <span class="external-sources-title" slot="title">External Sources</span>

    <svelte:fragment slot="right">
      <NavButton
        selected={$page.url.pathname.includes('external-sources/sources')}
        title="Sources"
        on:click={() => goto(`${base}/external-sources/sources`)}
      >
        <ExternalSourceIcon />
      </NavButton>
      <NavButton
        selected={$page.url.pathname.includes('external-sources/types')}
        title="Types"
        on:click={() => goto(`${base}/external-sources/types`)}
      >
        <TagIcon />
      </NavButton>
    </svelte:fragment>
  </Nav>
  <slot />
</CssGrid>
