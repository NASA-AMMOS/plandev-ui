<script lang="ts" context="module">
  import { reqSetAppStores } from '../utilities/requests';
  import type { LoadOutput } from '@sveltejs/kit';
  import '../css/app.css';

  export async function load({ fetch, session }): Promise<LoadOutput> {
    await reqSetAppStores(fetch, session);
    return {};
  }
</script>

<script lang="ts">
  import Nav from '../components/ui/Nav.svelte';

  let navWidth: number = 50;
</script>

<div style="grid-template-columns: {navWidth}px auto">
  <Nav width={navWidth} />
  <slot />
</div>

<style>
  div {
    display: grid;
    height: 100%;
    width: 100%;
  }
</style>
