<svelte:options immutable={true} />

<script lang="ts">
  import PhoenixIcon from '../../assets/aerie-phoenix-logo.svg?component';
  import Nav from '../../components/app/Nav.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav user={data.user}>
    <div class="sequencing-title" slot="title">
      <span class="app-icon"><PhoenixIcon height={16} /></span>
      Phoenix Sequencing
    </div>
  </Nav>
  <slot />
</CssGrid>

<style>
  .sequencing-title {
    align-items: center;
    display: flex;
  }
</style>
