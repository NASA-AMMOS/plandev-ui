<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { constraintsColumns } from '../../stores/constraints';
  import effects from '../../utilities/effects';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import ConstraintEditor from './ConstraintEditor.svelte';

  export let initialConstraintDefinition: string = 'export default (): Constraint => {\n\n}\n';
  export let initialConstraintDescription: string = '';
  export let initialConstraintId: number | null = null;
  export let initialConstraintName: string = '';
  export let initialConstraintModelId: number | null = null;
  export let initialConstraintPlanId: number | null = null;
  export let initialConstraintSummary: string = '';
  export let initialModels: ModelList[] = [];
  export let initialPlans: PlanList[] = [];
  export let mode: 'create' | 'edit' = 'create';

  let constraintDefinition: string = initialConstraintDefinition;
  let savedConstraintDefinition: string = mode === 'create' ? '' : initialConstraintDefinition;
  let constraintDescription: string = initialConstraintDescription;
  let constraintId: number | null = initialConstraintId;
  let constraintName: string = initialConstraintName;
  let constraintModelId: number | null = initialConstraintModelId;
  let constraintPlanId: number | null = initialConstraintPlanId;
  let constraintSummary: string = initialConstraintSummary;
  let models: ModelList[] = initialModels;
  let plans: PlanList[] = initialPlans;
  let saveButtonEnabled: boolean = false;

  $: saveButtonEnabled =
    constraintDefinition !== '' && constraintName !== '' && (constraintModelId !== null || constraintPlanId !== null);
  $: constraintModified = constraintDefinition !== savedConstraintDefinition;
  $: saveButtonText = mode === 'edit' && !constraintModified ? 'Saved' : 'Save';
  $: saveButtonClass = saveButtonEnabled && constraintModified ? 'primary' : 'secondary';

  $: if (constraintPlanId !== null) {
    const plan = initialPlans.find(plan => plan.id === constraintPlanId);
    if (plan) {
      constraintModelId = plan.model_id;
    }
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    constraintDefinition = value;
  }

  function onKeydown(event: KeyboardEvent): void {
    const { key, ctrlKey, metaKey } = event;
    if ((window.navigator.platform.match(/mac/i) ? metaKey : ctrlKey) && key === 's') {
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

        savedConstraintDefinition = constraintDefinition;
      }
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<CssGrid bind:columns={$constraintsColumns}>
  <Panel overflowYBody="hidden" padBody={false}>
    <svelte:fragment slot="header">
      <Chip>{mode === 'create' ? 'New Constraint' : 'Edit Constraint'}</Chip>

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
