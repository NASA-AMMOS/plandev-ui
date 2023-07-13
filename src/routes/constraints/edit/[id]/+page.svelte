<svelte:options immutable={true} />

<script lang="ts">
  import ConstraintForm from '../../../../components/constraints/ConstraintForm.svelte';
  import { tags } from '../../../../stores/tags';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ConstraintForm
  initialConstraintDefinition={data.initialConstraint.definition}
  initialConstraintDescription={data.initialConstraint.description}
  initialConstraintId={data.initialConstraint.id}
  initialConstraintModelId={data.initialConstraint.model_id}
  initialConstraintName={data.initialConstraint.name}
  initialConstraintPlanId={data.initialConstraint.plan_id}
  initialConstraintTags={data.initialConstraint.tags.map(({ tag }) => tag)}
  initialModelMap={data.initialModelMap}
  initialModels={data.initialModels}
  initialPlanMap={data.initialPlanMap}
  initialPlans={data.initialPlans}
  initialTags={$tags}
  mode="edit"
  user={data.user}
/>
