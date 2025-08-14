<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Sequences from '../../components/sequencing/Sequences.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Sequencing" />

<Sequences user={data.user} />
