<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Constraints from '../../components/constraints/Constraints.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Constraints" />

<Constraints
  initialModelMap={data.initialModelMap}
  initialPlanMap={data.initialPlanMap}
  initialPlans={data.initialPlans}
  user={data.user}
/>
