<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import LayersIcon from '@nasa-jpl/stellar/icons/layers.svg?component';
  import { List, SquareCode } from 'lucide-svelte';
  import Nav from '../../components/app/Nav.svelte';
  import NavButton from '../../components/app/NavButton.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav>
    <span class="expansion-title" slot="title">Expansion</span>

    <svelte:fragment slot="right">
      <NavButton
        selected={$page.url.pathname.includes('rules')}
        title="Rules"
        on:click={() => goto(`${base}/expansion/rules`)}
      >
        <SquareCode size={16} />
      </NavButton>
      <NavButton
        selected={$page.url.pathname.includes('sets')}
        title="Sets"
        on:click={() => goto(`${base}/expansion/sets`)}
      >
        <LayersIcon />
      </NavButton>
      <NavButton
        selected={$page.url.pathname.includes('runs')}
        title="Runs"
        on:click={() => goto(`${base}/expansion/runs`)}
      >
        <List size={16} />
      </NavButton>
    </svelte:fragment>
  </Nav>

  <slot />
</CssGrid>
