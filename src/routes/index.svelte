<script lang="ts" context="module">
  import type { LoadOutput } from '@sveltejs/kit';

  export async function load(): Promise<LoadOutput> {
    return {
      redirect: '/plans',
      status: 302,
    };
  }
</script>
