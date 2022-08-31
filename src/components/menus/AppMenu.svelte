<svelte:options accessors={true} />

<script lang="ts">
  import { goto, prefetch } from '$app/navigation';
  import { base } from '$app/paths';
  import { env } from '$env/dynamic/public';
  import CalendarIcon from '@nasa-jpl/stellar/icons/svg/calendar.svg?component';
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/svg/chevron_down.svg?component';
  import GraphQLIcon from '@nasa-jpl/stellar/icons/svg/graphql.svg?component';
  import PlanIcon from '@nasa-jpl/stellar/icons/svg/plan.svg?component';
  import { user as userStore } from '../../stores/app';
  import { showAboutModal } from '../../utilities/modal';
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';

  let appMenu: Menu;

  async function logout() {
    await fetch(`${base}/auth/logout`, { method: 'POST' });
    $userStore = null;
    goto(`${base}/login`);
  }
</script>

<div class="app-menu" on:click|stopPropagation={() => appMenu.toggle()}>
  <div class="app-icon">A</div>

  <ChevronDownIcon />

  <Menu bind:this={appMenu}>
    <MenuItem on:click={() => goto(`${base}/plans`)} on:pointerenter={() => prefetch(`${base}/plans`)}>
      <PlanIcon />
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
      <CalendarIcon />
      Scheduling
    </MenuItem>
    <MenuItem on:click={() => window.open(env.GATEWAY_CLIENT_URL, '_newtab')}>
      <i class="bi bi-diagram-3" />
      Gateway
    </MenuItem>
    <MenuItem on:click={() => window.open(`${env.GATEWAY_CLIENT_URL}/playground`, '_newtab')}>
      <GraphQLIcon />
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
    cursor: pointer;
    display: flex;
    gap: 5px;
    justify-content: center;
    position: relative;
  }

  .app-menu .bi {
    font-size: 1rem;
  }

  .app-icon {
    align-items: center;
    background-color: white;
    border-radius: 4px;
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
