<svelte:options immutable={true} />

<script lang="ts">
  import Nav from '../../components/app/Nav.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
</script>

<CssGrid rows="42px calc(100vh - 42px)">
  <Nav>
    <span class="sequencing-title" slot="title">Sequencing</span>
  </Nav>
  <slot />
</CssGrid>
