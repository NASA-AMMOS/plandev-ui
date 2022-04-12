<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';
  import '../css/app.css';
  import { env as envStore, user as userStore, version as versionStore } from '../stores/app';

  export const load: Load = async ({ fetch, session }) => {
    // Set env store.
    const envResponse = await fetch('/env');
    const env = await envResponse.json();
    envStore.set(env);

    // Set version store.
    const versionResponse = await fetch('/version.json');
    const version = await versionResponse.json();
    versionStore.set(version);

    // Set user store.
    userStore.set(session.user);

    return {};
  };
</script>

<slot />
