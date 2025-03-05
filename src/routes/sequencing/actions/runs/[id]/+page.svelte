<svelte:options immutable={true} />

<script lang="ts">
  import type { PageData } from '../$types';
  import ActionRun from '../../../../../components/sequencing/actions/ActionRun.svelte';
  import { actionRuns } from '../../../../../stores/actions';

  export let data: PageData;
</script>

<ActionRun user={data.user} actionRun={($actionRuns || []).find(run => run.id === parseInt(data.actionRunId))} />
