<script lang="ts" context="module">
  import { base } from '$app/paths';
  import type { Load } from '@sveltejs/kit';

  export const load: Load = () => {
    return {
      redirect: `${base}/plans`,
      status: 302,
    };
  };
</script>
