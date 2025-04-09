<svelte:options immutable={true} />

<script lang="ts">
  import Actions from '../../../components/sequencing/actions/Actions.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<Actions user={data.user} />
