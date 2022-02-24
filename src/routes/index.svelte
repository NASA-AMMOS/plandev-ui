<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';

  export const load: Load = () => {
    return {
      redirect: '/plans',
      status: 302,
    };
  };
</script>
