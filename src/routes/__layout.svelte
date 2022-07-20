<script lang="ts" context="module">
  import { base } from '$app/paths';
  import type { Load } from '@sveltejs/kit';
  import '../css/app.css';
  import { env as envStore, user as userStore, version as versionStore } from '../stores/app';
  import { modalBodyClickListener, modalBodyKeyListener } from '../utilities/modal';

  export const load: Load = async ({ fetch, session }) => {
    // Set env store.
    const envResponse = await fetch(`${base}/env`);
    const env = await envResponse.json();
    envStore.set(env);

    // Set version store.
    const versionResponse = await fetch(`${base}/version.json`);
    const version = await versionResponse.json();
    versionStore.set(version);

    // Set user store.
    userStore.set(session.user);

    return {};
  };
</script>

<svelte:body on:click={modalBodyClickListener} on:keydown={modalBodyKeyListener} />

<slot />

<div id="svelte-modal" />
