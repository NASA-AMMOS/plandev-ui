<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Models from '../../components/model/Models.svelte';
  import { getUserStore } from '../../stores/user';
  import type { PageData } from './$types';

  export let data: PageData;

  const user = getUserStore();
</script>

<PageTitle title="Models" />

<Models user={$user} initialModels={data.initialModels} />
