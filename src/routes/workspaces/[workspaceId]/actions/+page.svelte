<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../../components/app/PageTitle.svelte';
  import Actions from '../../../../components/sequencing/actions/Actions.svelte';
  import { getUserStore } from '../../../../stores/user';
  import type { PageData } from './$types';

  const user = getUserStore();

  export let data: PageData;

  const { initialWorkspace } = data;
</script>

<PageTitle title="Workspace: {initialWorkspace?.name} - Actions" />

<Actions user={$user} workspace={initialWorkspace} />
