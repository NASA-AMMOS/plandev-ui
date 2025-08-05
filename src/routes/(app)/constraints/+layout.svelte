<svelte:options immutable={true} />

<script lang="ts">
  import Nav from '../../../components/app/Nav.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import { userStore } from '../../../lib/stores/auth';
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav user={$userStore}>
    <span class="constraints-title" slot="title">Constraints</span>
  </Nav>
  <slot />
</CssGrid>
