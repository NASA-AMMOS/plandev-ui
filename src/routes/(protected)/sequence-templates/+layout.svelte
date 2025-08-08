<svelte:options immutable={true} />

<script lang="ts">
  import Nav from '../../../components/app/Nav.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import { userStore } from '../../../lib/stores/auth';
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav user={$userStore}>
    <div class="sequence-templates-title" slot="title">Sequence Templates</div>
  </Nav>
  <slot />
</CssGrid>

<style>
  .sequence-templates-title {
    align-items: center;
    display: flex;
  }
</style>
