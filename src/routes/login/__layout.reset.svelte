<script lang="ts" context="module">
  import { reqSetAppStores } from '../../utilities/requests';
  import type { LoadOutput } from '@sveltejs/kit';

  export async function load({ fetch, session }): Promise<LoadOutput> {
    await reqSetAppStores(fetch, session);
    return {};
  }
</script>

<slot />
