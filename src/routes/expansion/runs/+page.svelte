<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionRuns from '../../../components/expansion/ExpansionRuns.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ExpansionRuns expansionRuns={data.expansionRuns} user={data.user} />
