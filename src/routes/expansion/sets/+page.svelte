<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionSets from '../../../components/expansion/ExpansionSets.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ExpansionSets user={data.user} />
