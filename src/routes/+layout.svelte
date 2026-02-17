<svelte:options immutable={true} />

<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { env } from '$env/dynamic/public';
  import { cookieStoreListener } from '$lib/stores/oidc';
  import { ModeWatcher } from '@nasa-jpl/stellar-svelte';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { mergeWith } from 'lodash-es';
  import { onMount, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import ConnectionStatusBanner from '../components/app/ConnectionStatusBanner.svelte';
  import Nav from '../components/app/Nav.svelte';
  import Loading from '../components/Loading.svelte';
  import { clearLogs } from '../stores/errors';
  import { disposeSharedClient, restartSharedClient } from '../stores/gqlClient';
  import { plugins, pluginsError, pluginsLoaded } from '../stores/plugins';
  import type { UserStore } from '../types/app';
  import { getCookieValue } from '../utilities/browser';
  import { loadPluginCode } from '../utilities/plugins';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  const user: UserStore = writable(null);

  let pluginsEnabled = env.PUBLIC_TIME_PLUGIN_ENABLED === 'true';
  let previousRole: string | null = null;

  $pluginsLoaded = pluginsEnabled ? false : true;

  $: {
    let userData = data.user ? { ...data.user } : null;
    // In OIDC mode, data.user may be stale after HMR (token expired, role changed).
    // Replace with current cookie values.
    if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true' && userData) {
      const freshToken = getCookieValue('accessToken');
      if (freshToken) {
        userData = { ...userData, token: freshToken };
      }
      const activeRole = getCookieValue('activeRole');
      if (activeRole) {
        userData = { ...userData, activeRole };
      }
    }
    user.set(userData);
  }

  // Only restart WebSocket when role actually changes, not on every navigation
  // graphql-ws automatically re-subscribes all active subscriptions when reconnected
  $: {
    const newRole = $user?.activeRole ?? null;
    // Only restart when role actually changes, not on initial load
    if (previousRole !== null && newRole !== previousRole) {
      restartSharedClient();
    }
    previousRole = newRole;
  }

  onMount(() => {
    const onTokenRefreshed = (e: Event) => {
      const { token } = (e as CustomEvent<{ token: string }>).detail;
      user.update(u => (u ? { ...u, token } : u));
    };

    if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true' && $user) {
      cookieStoreListener();
      window.addEventListener('oidc-token-refreshed', onTokenRefreshed);
    }

    if (pluginsEnabled && !$pluginsLoaded) {
      loadPlugins();
    }

    return () => {
      // Use the window-stored cleanup which always targets the current listener,
      // even if HMR re-established it with fresh module references.
      const oidcCleanup = (window as any).__oidcCookieCleanup as (() => void) | undefined;
      oidcCleanup?.();
      window.removeEventListener('oidc-token-refreshed', onTokenRefreshed);
      console.log('Unsubscribed from cookie store changes.');

      // Skip disposing the WebSocket client during HMR - the client should persist
      // across layout re-mounts so restartSharedClient() can still manage it.
      // On full page unload, the browser closes the WebSocket automatically.
      if (!import.meta.hot) {
        disposeSharedClient();
      }
    };
  });

  beforeNavigate(() => {
    // Clear logs on page change
    clearLogs();
  });

  async function loadPlugins() {
    try {
      // Load plugins and merge with default plugin
      const userPlugins = await loadPluginCode('/resources/time-plugin.js');
      $plugins = mergeWith($plugins, userPlugins, (_, src) => (Array.isArray(src) ? src : undefined));
      $pluginsLoaded = true;
    } catch (err) {
      console.log('Unable to load plugin:', err);
      $pluginsLoaded = false;
      $pluginsError = `Unable to load plugin: ${err}`;
    }
  }

  setContext('user', user);
</script>

<ConnectionStatusBanner />
{#if !pluginsEnabled || ($pluginsLoaded && !$pluginsError)}
  <slot />
{:else}
  <div class="plans-layout">
    <Nav />
    <div class="message st-typography-header">
      {#if $pluginsError}
        <div class="error">
          <WarningIcon />
          {$pluginsError}
        </div>
      {:else}
        <div class="delay-visibility">
          <Loading>Loading plugins...</Loading>
        </div>
      {/if}
    </div>
  </div>
{/if}

<div id="svelte-modal" />

<!-- Disable theme switching for now to prevent user OS/browser dark mode from changing the app which does not yet fully support dark mode -->
<ModeWatcher track={false} defaultMode="light" />

<style>
  .plans-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .message {
    align-items: center;
    display: flex;
    flex: 1;
    justify-content: center;
    width: 100%;
  }

  .error {
    align-items: center;
    color: var(--st-error-red);
    display: flex;
    gap: 8px;
    max-width: 70vw;
    text-wrap: balance;
  }

  .error :global(svg) {
    flex-shrink: 0;
  }

  .delay-visibility {
    animation: 1s delayVisibility;
  }

  @keyframes delayVisibility {
    0% {
      visibility: hidden;
    }
    99% {
      visibility: hidden;
    }
    100% {
      visibility: visible;
    }
  }
</style>
