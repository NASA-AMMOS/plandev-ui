<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import CalendarIcon from 'bootstrap-icons/icons/calendar3.svg?component';
  import Nav from '../../components/app/Nav.svelte';
  import NavButton from '../../components/app/NavButton.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav>
    <span class="scheduling-title" slot="title">Scheduling</span>

    <svelte:fragment slot="right">
      <NavButton
        selected={$page.url.pathname.includes('goals')}
        title="Goals"
        on:click={() => goto(`${base}/scheduling/goals`)}
      >
        <CalendarIcon />
      </NavButton>
    </svelte:fragment>
  </Nav>

  <slot />
</CssGrid>
