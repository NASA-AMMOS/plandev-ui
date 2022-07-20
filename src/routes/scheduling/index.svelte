<svelte:options immutable={true} />

<script lang="ts" context="module">
  import { base } from '$app/paths';
  import type { Load } from '@sveltejs/kit';

  export const load: Load = () => {
    return {
      redirect: `${base}/scheduling/goals`,
      status: 302,
    };
  };
</script>
