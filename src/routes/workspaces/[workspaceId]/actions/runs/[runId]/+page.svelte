<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../../../../components/app/PageTitle.svelte';
  import ActionRun from '../../../../../../components/sequencing/actions/ActionRun.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Workspace: {data.initialWorkspace?.name} - Actions - Run {data.initialActionRun?.id}" />

<ActionRun user={data.user} initialActionRun={data.initialActionRun} workspaceId={data.initialWorkspace?.id ?? null} />
