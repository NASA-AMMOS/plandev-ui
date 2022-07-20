<svelte:options accessors={true} />

<script lang="ts">
  import { goto, prefetch } from '$app/navigation';
  import { base } from '$app/paths';
  import { session } from '$app/stores';
  import { env } from '../../stores/app';
  import { showAboutModal } from '../../utilities/modal';
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';

  let appMenu: Menu;

  async function logout() {
    await fetch(`${base}/auth/logout`, { method: 'POST' });
    $session.user = null; // Triggers redirect.
    goto(`${base}/login`);
  }
</script>

<div class="app-menu" on:click|stopPropagation={() => appMenu.toggle()}>
  <div class="app-icon">A</div>

  <i class="bi bi-chevron-down" />

  <Menu bind:this={appMenu}>
    <MenuItem on:click={() => goto(`${base}/plans`)} on:pointerenter={() => prefetch(`${base}/plans`)}>
      <i class="bi bi-calendar-range" />
      Plans
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/models`)} on:pointerenter={() => prefetch(`${base}/models`)}>
      <i class="bi bi-bar-chart" />
      Models
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/constraints`)} on:pointerenter={() => prefetch(`${base}/constraints`)}>
      <i class="bi bi-braces-asterisk" />
      Constraints
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/dictionaries`)} on:pointerenter={() => prefetch(`${base}/dictionaries`)}>
      <i class="bi bi-journal-text" />
      Dictionaries
    </MenuItem>
    <MenuItem
      on:click={() => goto(`${base}/expansion/rules`)}
      on:pointerenter={() => prefetch(`${base}/expansion/rules`)}
    >
      <i class="bi bi-code-square" />
      Expansion
    </MenuItem>
    <MenuItem
      on:click={() => goto(`${base}/scheduling/goals`)}
      on:pointerenter={() => prefetch(`${base}/scheduling/goals`)}
    >
      <i class="bi bi-calendar3" />
      Scheduling
    </MenuItem>
    <MenuItem on:click={() => window.open($env.GATEWAY_CLIENT_URL, '_newtab')}>
      <i class="bi bi-diagram-3" />
      Gateway
    </MenuItem>
    <MenuItem on:click={() => window.open(`${$env.GATEWAY_CLIENT_URL}/playground`, '_newtab')}>
      <i class="si si-graphql" />
      GraphQL Playground
    </MenuItem>
    <MenuItem on:click={() => logout()}>
      <i class="bi bi-box-arrow-right" />
      Logout
    </MenuItem>
    <MenuItem on:click={() => showAboutModal()}>
      <i class="bi bi-info-circle" />
      About
    </MenuItem>
  </Menu>
</div>

<style>
  .app-menu {
    align-items: center;
    display: flex;
    cursor: pointer;
    gap: 5px;
    justify-content: center;
    position: relative;
  }

  .app-icon {
    align-items: center;
    border-radius: 4px;
    background-color: white;
    color: black;
    display: flex;
    font-size: 16px;
    font-weight: 700;
    height: 24px;
    justify-content: center;
    line-height: 24px;
    width: 24px;
  }
</style>
