<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Models from '../../components/model/Models.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Models" />

<Models user={data.user} />
