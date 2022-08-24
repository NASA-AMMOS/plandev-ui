<svelte:options immutable={true} />

<script lang="ts">
  import Constraints from '../../components/constraints/Constraints.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<Constraints initialPlans={data.initialPlans} />
