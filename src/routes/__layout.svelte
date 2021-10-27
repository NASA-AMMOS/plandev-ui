<script lang="ts" context="module">
  import { reqSetConfig } from '../utilities/requests';
  import type { LoadOutput } from '@sveltejs/kit';

  export async function load({ fetch }): Promise<LoadOutput> {
    await reqSetConfig(fetch);
    return {};
  }
</script>

<script lang="ts">
  import '../css/app.css';
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
