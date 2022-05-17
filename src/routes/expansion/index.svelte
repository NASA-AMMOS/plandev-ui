<svelte:options immutable={true} />

<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';

  export const load: Load = () => {
    return {
      redirect: '/expansion/rules',
      status: 302,
    };
  };
</script>
