<script lang="ts">
  import { goto, prefetch } from '$app/navigation';
  import { page, session } from '$app/stores';
  import AboutModal from '../modals/About.svelte';
  import { GATEWAY_URL } from '../../env';
  import { tooltip } from '../../utilities/tooltip';

  type NavItem = {
    iconClass: string;
    iconFontSize: number;
    name: string;
    path: string | null;
  };

  export let navItems: NavItem[] = [
    {
      iconClass: 'bi bi-calendar-range',
      iconFontSize: 16,
      name: 'Plans',
      path: '/plans',
    },
    {
      iconClass: 'bi bi-bar-chart',
      iconFontSize: 16,
      name: 'Models',
      path: '/models',
    },
    {
      iconClass: 'ai ai-graphql',
      iconFontSize: 25,
      name: 'GraphQL',
      path: null,
    },
    {
      iconClass: 'bi bi-box-arrow-right',
      iconFontSize: 16,
      name: 'Logout',
      path: null,
    },
    {
      iconClass: 'bi bi-info-circle',
      iconFontSize: 16,
      name: 'About',
      path: null,
    },
  ];
  export let width: number;

  let about: AboutModal | null = null;

  async function onClickNavItem(item: NavItem) {
    const { name, path } = item;
    if (path) {
      goto(path);
    } else if (name === 'About' && about) {
      about.modal.toggle();
    } else if (name === 'GraphQL') {
      open(`${GATEWAY_URL}/playground`, '_newtab');
    } else if (name === 'Logout') {
      await fetch('/auth/logout', { method: 'POST' });
      $session.user = null; // Triggers redirect.
    }
  }
</script>

<div
  class="nav"
  style="grid-template-rows: repeat({navItems.length}, {width}px)"
>
  {#each navItems as item}
    <div
      class="nav-item"
      class:active={$page.path.includes(item.path)}
      style="height: {width}px; width: {width}px;"
      on:pointerenter={() => item.path && prefetch(item.path)}
      on:click|stopPropagation={() => onClickNavItem(item)}
      use:tooltip={{ content: item.name, placement: 'right' }}
    >
      <i class={item.iconClass} style="font-size: {item.iconFontSize}px" />
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
    background-color: var(--gray-20);
  }
</style>
