<svelte:options accessors={true} />

<script lang="ts">
  import { goto, preloadData } from '$app/navigation';
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
  import { logout } from '../../utilities/login';
  import { showAboutModal } from '../../utilities/modal';
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';

  let appMenu: Menu;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="app-menu" on:click|stopPropagation={() => appMenu.toggle()}>
  <div class="app-icon"><AerieWordmarkDark /></div>

  <ChevronDownIcon />

  <Menu bind:this={appMenu}>
    <MenuItem on:click={() => goto(`${base}/plans`)} on:pointerenter={() => preloadData(`${base}/plans`)}>
      <PlanIcon />
      Plans
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/models`)} on:pointerenter={() => preloadData(`${base}/models`)}>
      <BarChartIcon />
      Models
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/constraints`)} on:pointerenter={() => preloadData(`${base}/constraints`)}>
      <BracesAsteriskIcon />
      Constraints
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/dictionaries`)} on:pointerenter={() => preloadData(`${base}/dictionaries`)}>
      <JournalTextIcon />
      Command Dictionaries
    </MenuItem>
    <MenuItem
      on:click={() => goto(`${base}/expansion/rules`)}
      on:pointerenter={() => preloadData(`${base}/expansion/rules`)}
    >
      <CodeSquareIcon />
      Expansion
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/scheduling`)} on:pointerenter={() => preloadData(`${base}/scheduling`)}>
      <CalendarIcon />
      Scheduling
    </MenuItem>
    <MenuItem on:click={() => goto(`${base}/sequencing`)} on:pointerenter={() => preloadData(`${base}/sequencing`)}>
      <JournalCodeIcon />
      Sequencing
    </MenuItem>
    <MenuItem on:click={() => window.open(env.PUBLIC_GATEWAY_CLIENT_URL, '_newtab')}>
      <DiagramIcon />
      Gateway
    </MenuItem>
    <MenuItem on:click={() => window.open(`${env.PUBLIC_GATEWAY_CLIENT_URL}/api-playground`, '_newtab')}>
      <GraphQLIcon />
      GraphQL Playground
    </MenuItem>
    <MenuItem on:click={() => window.open('https://nasa-ammos.github.io/aerie-docs/', '_newtab')}>
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
