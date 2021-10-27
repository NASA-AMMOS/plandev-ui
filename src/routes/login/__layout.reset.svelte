<script lang="ts" context="module">
  import { reqSetConfig } from '../../utilities/requests';
  import type { LoadOutput } from '@sveltejs/kit';

  export async function load({ fetch }): Promise<LoadOutput> {
    await reqSetConfig(fetch);
    return {};
  }
</script>

<slot />
