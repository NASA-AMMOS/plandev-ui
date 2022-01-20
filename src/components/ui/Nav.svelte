<script lang="ts">
  import { goto, prefetch } from '$app/navigation';
  import { page, session } from '$app/stores';
  import AboutModal from '../modals/About.svelte';
  import { tooltip } from '../../utilities/tooltip';
  import { env } from '../../stores/app';

  type NavItem = {
    iconClass: string;
    name: string;
    path: string | null;
  };

  export let navItems: NavItem[] = [
    {
      iconClass: 'bi bi-calendar-range',
      name: 'Plans',
      path: '/plans',
    },
    {
      iconClass: 'bi bi-bar-chart',
      name: 'Models',
      path: '/models',
    },
    {
      iconClass: 'si si-graphql',
      name: 'GraphQL',
      path: null,
    },
    {
      iconClass: 'bi bi-diagram-3',
      name: 'Gateway',
      path: null,
    },
    {
      iconClass: 'bi bi-box-arrow-right',
      name: 'Logout',
      path: null,
    },
    {
      iconClass: 'bi bi-info-circle',
      name: 'About',
      path: null,
    },
  ];
  export let width: number;

  let about: AboutModal | null = null;

  $: filteredNavItems = navItems.filter(item => {
    if (item.name === 'Logout' && $env.AUTH_TYPE === 'none') {
      return false;
    }
    return true;
  });

  async function onClickNavItem(item: NavItem) {
    const { name, path } = item;
    if (path) {
      goto(path);
    } else if (name === 'About' && about) {
      about.modal.toggle();
    } else if (name === 'Gateway') {
      open(`${$env.GATEWAY_CLIENT_URL}`, '_newtab');
    } else if (name === 'GraphQL') {
      open(`${$env.GATEWAY_CLIENT_URL}/playground`, '_newtab');
    } else if (name === 'Logout') {
      await fetch('/auth/logout', { method: 'POST' });
      $session.user = null; // Triggers redirect.
    }
  }
</script>

<div
  class="nav"
  style="grid-template-rows: repeat({filteredNavItems.length}, {width}px)"
>
  {#each filteredNavItems as item}
    <div
      class="nav-item"
      class:active={$page.url.pathname.includes(item.path)}
      style="height: {width}px; width: {width}px;"
      on:pointerenter={() => item.path && prefetch(item.path)}
      on:click|stopPropagation={() => onClickNavItem(item)}
      use:tooltip={{ content: item.name, placement: 'right' }}
    >
      <i class={item.iconClass} />
    </div>
  {/each}
</div>

<AboutModal bind:this={about} />

<style>
  .nav {
    border-right: 1px solid rgba(0, 0, 0, 0.12);
  }

  .nav-item {
    align-items: center;
    cursor: pointer;
    display: flex;
    font-size: 16px;
    justify-content: center;
  }

  .nav-item.active {
    background-image: linear-gradient(
      to right,
      rgba(0, 0, 0, 1) 3px,
      rgba(0, 0, 0, 1) 3px,
      rgba(0, 0, 0, 0) 3px
    );
  }

  .nav-item:hover {
    background-color: var(--st-gray-20);
  }
</style>
