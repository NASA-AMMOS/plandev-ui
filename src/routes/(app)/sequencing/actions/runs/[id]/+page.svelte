<svelte:options immutable={true} />

<script lang="ts">
  import ActionRun from '../../../../../../components/sequencing/actions/ActionRun.svelte';
  import { userStore } from '../../../../../../lib/stores/auth';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ActionRun user={$userStore} initialActionRun={data.initialActionRun} />
