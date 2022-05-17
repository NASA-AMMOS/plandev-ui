<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Nav from '../../components/app/Nav.svelte';
  import NavButton from '../../components/app/NavButton.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
</script>

<CssGrid rows="42px calc(100vh - 42px)">
  <Nav>
    <span class="expansion-title" slot="title">Expansion</span>

    <svelte:fragment slot="right">
      <NavButton
        icon="bi bi-code-square"
        selected={$page.url.pathname.includes('rules')}
        title="Rules"
        on:click={() => goto('/expansion/rules')}
      />
    </svelte:fragment>
  </Nav>

  <slot />
</CssGrid>
