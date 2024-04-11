<svelte:options immutable={true} />

<script lang="ts">
  import PlanMergeReview from '../../../../components/plan/PlanMergeReview.svelte';
  import { initialPlan } from '../../../../stores/plan';
  import type { PageData } from './$types';

  export let data: PageData;

  $: if (data.initialPlan) {
    $initialPlan = data.initialPlan;
  }
</script>

<PlanMergeReview
  initialConflictingActivities={data.initialConflictingActivities}
  initialPlan={data.initialPlan}
  initialMergeRequest={data.initialMergeRequest}
  initialNonConflictingActivities={data.initialNonConflictingActivities}
  user={data.user}
/>
