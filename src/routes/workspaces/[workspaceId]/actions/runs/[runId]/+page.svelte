<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../../../../components/app/PageTitle.svelte';
  import ActionRun from '../../../../../../components/sequencing/actions/ActionRun.svelte';
  import { getUserStore } from '../../../../../../stores/user';
  import type { PageData } from './$types';

  export let data: PageData;

  const user = getUserStore();
</script>

<PageTitle title="Workspace: {data.initialWorkspace?.name} - Actions - Run {data.initialActionRun?.id}" />

<ActionRun user={$user} initialActionRun={data.initialActionRun} workspaceId={data.initialWorkspace?.id ?? null} />
