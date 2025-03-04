<svelte:options immutable={true} />

<script lang="ts">
  import type { PageData } from './$types';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import SequenceTemplates from '../../components/sequence-templates/SequenceTemplates.svelte';

  export let data: PageData;
</script>

<PageTitle title="Sequencing" />

<SequenceTemplates user={data.user} />
