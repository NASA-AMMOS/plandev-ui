<svelte:options immutable={true} />

<script lang="ts">
  import ConstraintForm from '../../../components/constraints/ConstraintForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ConstraintForm initialModels={data.initialModels} initialPlans={data.initialPlans} mode="create" />
