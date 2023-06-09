<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import ExpansionRules from '../../../components/expansion/ExpansionRules.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Expansion Rules" />

<ExpansionRules user={data.user} />
