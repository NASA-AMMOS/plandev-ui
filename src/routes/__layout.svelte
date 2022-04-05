<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';
  import '../css/app.css';
  import req from '../utilities/requests';

  export const load: Load = async ({ fetch, session }) => {
    await req.setAppStores(fetch, session);
    return {};
  };
</script>

<div>
  <slot />
</div>

<style>
  div {
    display: grid;
    height: 100%;
    width: 100%;
  }
</style>
