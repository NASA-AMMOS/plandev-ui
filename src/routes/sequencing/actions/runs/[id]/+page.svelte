<svelte:options immutable={true} />

<script lang="ts">
  import type { PageData } from '../$types';
  import ActionRun from '../../../../../components/sequencing/actions/ActionRun.svelte';

  export let data: PageData;
</script>

<ActionRun user={data.user} initialActionRun={data.initialActionRun} />
