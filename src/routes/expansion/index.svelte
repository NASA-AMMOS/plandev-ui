<svelte:options immutable={true} />

<script lang="ts" context="module">
  import { base } from '$app/paths';
  import type { Load } from '@sveltejs/kit';

  export const load: Load = () => {
    return {
      redirect: `${base}/expansion/rules`,
      status: 302,
    };
  };
</script>
