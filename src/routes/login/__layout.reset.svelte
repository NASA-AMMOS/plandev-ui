<script lang="ts" context="module">
  import type { LoadOutput } from '@sveltejs/kit';
  import '../../css/app.css';
  import req from '../../utilities/requests';

  export async function load({ fetch, session }): Promise<LoadOutput> {
    await req.setAppStores(fetch, session);
    return {};
  }
</script>

<slot />
