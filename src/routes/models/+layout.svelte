<svelte:options immutable={true} />

<script lang="ts">
  import Nav from '../../components/app/Nav.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav>
    <span class="models-title" slot="title">Models</span>
  </Nav>
  <slot />
</CssGrid>
