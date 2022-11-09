<svelte:options accessors={true} />

<script lang="ts">
  import { goto, invalidateAll, prefetch } from '$app/navigation';
  import { base } from '$app/paths';
  import { env } from '$env/dynamic/public';
  import CalendarIcon from '@nasa-jpl/stellar/icons/calendar.svg?component';
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import GraphQLIcon from '@nasa-jpl/stellar/icons/graphql.svg?component';
  import PlanIcon from '@nasa-jpl/stellar/icons/plan.svg?component';
  import BarChartIcon from 'bootstrap-icons/icons/bar-chart.svg?component';
  import BoxArrowRightIcon from 'bootstrap-icons/icons/box-arrow-right.svg?component';
  import BracesAsteriskIcon from 'bootstrap-icons/icons/braces-asterisk.svg?component';
  import CodeSquareIcon from 'bootstrap-icons/icons/code-square.svg?component';
  import DiagramIcon from 'bootstrap-icons/icons/diagram-3.svg?component';
  import InfoCircleIcon from 'bootstrap-icons/icons/info-circle.svg?component';
  import JournalCodeIcon from 'bootstrap-icons/icons/journal-code.svg?component';
  import JournalTextIcon from 'bootstrap-icons/icons/journal-text.svg?component';
  import JournalsIcon from 'bootstrap-icons/icons/journals.svg?component';
  import AerieWordmarkDark from '../../assets/aerie-wordmark-dark.svg?component';
  import { user as userStore } from '../../stores/app';
  import { showAboutModal } from '../../utilities/modal';
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';

  let appMenu: Menu;

  async function logout() {
    await fetch(`${base}/auth/logout`, { method: 'POST' });
    $userStore = null;
    await invalidateAll();
    await goto(`${base}/login`);
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="app-menu" on:click|stopPropagation={() => appMenu.toggle()}>
  <div class="app-icon"><AerieWordmarkDark /></div>

  <ChevronDownIcon />

  <Menu bind:this={appMenu}>
    <MenuItem on:click={() => goto(`${base}/plans`)} on:pointerenter={() => prefetch(`${base}/plans`)}>
      <PlanIcon />
      Plans
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/models`)} on:pointerenter={() => prefetch(`${base}/models`)}>
      <BarChartIcon />
      Models
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/constraints`)} on:pointerenter={() => prefetch(`${base}/constraints`)}>
      <BracesAsteriskIcon />
      Constraints
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/dictionaries`)} on:pointerenter={() => prefetch(`${base}/dictionaries`)}>
      <JournalTextIcon />
      Command Dictionaries
    </MenuItem>
    <MenuItem
      on:click={() => goto(`${base}/expansion/rules`)}
      on:pointerenter={() => prefetch(`${base}/expansion/rules`)}
    >
      <CodeSquareIcon />
      Expansion
    </MenuItem>
    <MenuItem
      on:click={() => goto(`${base}/scheduling/goals`)}
      on:pointerenter={() => prefetch(`${base}/scheduling/goals`)}
    >
      <CalendarIcon />
      Scheduling
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/sequencing`)} on:pointerenter={() => prefetch(`${base}/sequencing`)}>
      <JournalCodeIcon />
      Sequencing
    </MenuItem>
    <MenuItem on:click={() => window.open(env.PUBLIC_GATEWAY_CLIENT_URL, '_newtab')}>
      <DiagramIcon />
      Gateway
    </MenuItem>
    <MenuItem on:click={() => window.open(`${env.PUBLIC_GATEWAY_CLIENT_URL}/playground`, '_newtab')}>
      <GraphQLIcon />
      GraphQL Playground
    </MenuItem>
    <MenuItem on:click={() => window.open('https://nasa-ammos.github.io/aerie/stable/', '_newtab')}>
      <JournalsIcon />
      Documentation
    </MenuItem>
    <MenuItem on:click={() => logout()}>
      <BoxArrowRightIcon />
      Logout
    </MenuItem>
    <MenuItem on:click={() => showAboutModal()}>
      <InfoCircleIcon />
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

  .app-icon {
    align-items: center;
    display: flex;
    font-size: 24px;
    height: 24px;
    justify-content: center;
    line-height: 24px;
    width: 88px;
  }
</style>
