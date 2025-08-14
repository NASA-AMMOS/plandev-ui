<svelte:options immutable={true} />

<script lang="ts">
  import ActionRun from '../../../../../components/sequencing/actions/ActionRun.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ActionRun user={data.user} initialActionRun={data.initialActionRun} />
