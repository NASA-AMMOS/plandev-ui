<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { constraintsColumns } from '../../stores/constraints';
  import type { Constraint } from '../../types/constraint';
  import type { ModelSlim } from '../../types/model';
  import type { PlanSlim } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { isSaveEvent } from '../../utilities/keyboardEvents';
  import PageTitle from '../app/PageTitle.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import ConstraintEditor from './ConstraintEditor.svelte';

  export let initialConstraintDefinition: string = 'export default (): Constraint => {\n\n}\n';
  export let initialConstraintDescription: string = '';
  export let initialConstraintId: number | null = null;
  export let initialConstraintName: string = '';
  export let initialConstraintModelId: number | null = null;
  export let initialConstraintPlanId: number | null = null;
  export let initialConstraintSummary: string = '';
  export let initialModels: ModelSlim[] = [];
  export let initialPlans: PlanSlim[] = [];
  export let mode: 'create' | 'edit' = 'create';

  let constraintDefinition: string = initialConstraintDefinition;
  let constraintDescription: string = initialConstraintDescription;
  let constraintId: number | null = initialConstraintId;
  let constraintName: string = initialConstraintName;
  let constraintModelId: number | null = initialConstraintModelId;
  let constraintPlanId: number | null = initialConstraintPlanId;
  let constraintSummary: string = initialConstraintSummary;
  let models: ModelSlim[] = initialModels;
  let plans: PlanSlim[] = initialPlans;
  let saveButtonEnabled: boolean = false;
  let savedConstraint: Partial<Constraint> = {
    definition: constraintDefinition,
    description: constraintDescription,
    model_id: constraintModelId,
    name: constraintName,
    plan_id: constraintPlanId,
    summary: constraintSummary,
  };

  $: saveButtonEnabled =
    constraintDefinition !== '' && constraintName !== '' && (constraintModelId !== null || constraintPlanId !== null);
  $: constraintModified = diffConstraints(savedConstraint, {
    definition: constraintDefinition,
    description: constraintDescription,
    model_id: constraintModelId,
    name: constraintName,
    plan_id: constraintPlanId,
    summary: constraintSummary,
  });
  $: saveButtonText = mode === 'edit' && !constraintModified ? 'Saved' : 'Save';
  $: saveButtonClass = saveButtonEnabled && constraintModified ? 'primary' : 'secondary';
  $: pageTitle = mode === 'edit' ? 'Constraints' : 'New Constraint';
  $: pageSubtitle = mode === 'edit' ? savedConstraint.name : '';

  $: if (constraintPlanId !== null) {
    const plan = initialPlans.find(plan => plan.id === constraintPlanId);
    if (plan) {
      constraintModelId = plan.model_id;
    }
  }

  function diffConstraints(constraintA: Partial<Constraint>, constraintB: Partial<Constraint>) {
    if (
      constraintA.definition !== constraintB.definition ||
      constraintA.description !== constraintB.description ||
      constraintA.name !== constraintB.name ||
      constraintA.summary !== constraintB.summary ||
      constraintA.plan_id !== constraintB.plan_id
    ) {
      return true;
    } else if (constraintA.plan_id === null && constraintB.plan_id === null) {
      // only diff model_id if both plan_ids are null
      // to replicate the behavior where when saving a constraint, the model_id is ignored
      // if a plan_id is supplied
      return constraintA.model_id !== constraintB.model_id;
    }
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    constraintDefinition = value;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      saveConstraint();
    }
  }

  async function saveConstraint() {
    if (saveButtonEnabled) {
      if (mode === 'create') {
        const newConstraintId = await effects.createConstraint(
          constraintDefinition,
          constraintDescription,
          constraintModelId,
          constraintName,
          constraintPlanId,
          constraintSummary,
        );

        if (newConstraintId !== null) {
          goto(`${base}/constraints/edit/${newConstraintId}`);
        }
      } else if (mode === 'edit') {
        await effects.updateConstraint(
          constraintId,
          constraintDefinition,
          constraintDescription,
          constraintModelId,
          constraintName,
          constraintPlanId,
          constraintSummary,
        );

        savedConstraint = {
          definition: constraintDefinition,
          description: constraintDescription,
          model_id: constraintModelId,
          name: constraintName,
          plan_id: constraintPlanId,
          summary: constraintSummary,
        };
      }
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<PageTitle subTitle={pageSubtitle} title={pageTitle} />

<CssGrid bind:columns={$constraintsColumns}>
  <Panel overflowYBody="hidden" padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>{mode === 'create' ? 'New Constraint' : 'Edit Constraint'}</SectionTitle>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/constraints`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button class="st-button {saveButtonClass} ellipsis" disabled={!saveButtonEnabled} on:click={saveConstraint}>
          {saveButtonText}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if mode === 'edit'}
        <fieldset>
          <label for="constraintId">Constraint ID</label>
          <input class="st-input w-100" disabled name="constraintId" value={constraintId} />
        </fieldset>
      {/if}

      <fieldset>
        <label for="model">Model</label>
        <select
          bind:value={constraintModelId}
          class="st-select w-100"
          disabled={constraintPlanId !== null}
          name="model"
        >
          <option value={null} />
          {#each models as model}
            <option value={model.id}>
              {model.name} ({model.id})
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="plan">Plan</label>
        <select bind:value={constraintPlanId} class="st-select w-100" name="plan">
          <option value={null} />
          {#each plans as plan}
            <option value={plan.id}>
              {plan.name} ({plan.id})
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="constraint-name">Name</label>
        <input
          bind:value={constraintName}
          autocomplete="off"
          class="st-input w-100"
          name="constraint-name"
          placeholder="Enter Constraint Name (required)"
          required
        />
      </fieldset>

      <fieldset>
        <label for="constraint-description">Description</label>
        <input
          bind:value={constraintDescription}
          autocomplete="off"
          class="st-input w-100"
          name="constraint-description"
          placeholder="Enter Constraint Description (optional)"
        />
      </fieldset>

      <fieldset>
        <label for="constraint-summary">Summary</label>
        <textarea
          bind:value={constraintSummary}
          autocomplete="off"
          class="st-input w-100"
          name="constraint-summary"
          placeholder="Enter Constraint Summary (optional)"
        />
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <ConstraintEditor
    {constraintDefinition}
    {constraintModelId}
    {constraintPlanId}
    title="{mode === 'create' ? 'New' : 'Edit'} Constraint - Definition Editor"
    on:didChangeModelContent={onDidChangeModelContent}
  />
</CssGrid>
