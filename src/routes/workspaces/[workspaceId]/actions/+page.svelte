<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../../components/app/PageTitle.svelte';
  import Actions from '../../../../components/sequencing/actions/Actions.svelte';
  import { userStore } from '../../../../lib/stores/auth';
  import type { PageData } from './$types';

  export let data: PageData;

  const { initialWorkspace } = data;
</script>

<PageTitle title="Workspace: {initialWorkspace?.name} - Actions" />

<Actions user={$userStore} workspace={initialWorkspace} />
