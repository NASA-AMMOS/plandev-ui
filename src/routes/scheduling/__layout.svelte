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
    <span class="scheduling-title" slot="title">Scheduling</span>

    <svelte:fragment slot="right">
      <NavButton
        icon="bi bi-calendar3"
        selected={$page.url.pathname.includes('goals')}
        title="Goals"
        on:click={() => goto('/scheduling/goals')}
      />
    </svelte:fragment>
  </Nav>

  <slot />
</CssGrid>
