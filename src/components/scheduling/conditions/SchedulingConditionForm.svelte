<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { user as userStore } from '../../../stores/app';
  import { schedulingColumns } from '../../../stores/scheduling';
  import type { ModelSlim } from '../../../types/model';
  import type { PlanSchedulingSpec } from '../../../types/plan';
  import type { SchedulingCondition, SchedulingSpecConditionInsertInput } from '../../../types/scheduling';
  import effects from '../../../utilities/effects';
  import { isSaveEvent } from '../../../utilities/keyboardEvents';
  import CssGrid from '../../ui/CssGrid.svelte';
  import CssGridGutter from '../../ui/CssGridGutter.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';
  import SchedulingEditor from '../SchedulingEditor.svelte';

  export let initialConditionAuthor: string | null = null;
  export let initialConditionCreatedDate: string | null = null;
  export let initialConditionDefinition: string = 'export default (): GlobalSchedulingCondition => {\n\n}\n';
  export let initialConditionDescription: string = '';
  export let initialConditionId: number | null = null;
  export let initialConditionModelId: number | null = null;
  export let initialConditionModifiedDate: string | null = null;
  export let initialConditionName: string = '';
  export let initialSpecId: number | null = null;
  export let mode: 'create' | 'edit' = 'create';
  export let models: ModelSlim[] = [];
  export let plans: PlanSchedulingSpec[] = [];

  let conditionAuthor: string | null = initialConditionAuthor;
  let conditionCreatedDate: string | null = initialConditionCreatedDate;
  let conditionDefinition: string = initialConditionDefinition;
  let conditionDescription: string = initialConditionDescription;
  let conditionId: number | null = initialConditionId;
  let conditionModelId: number | null = initialConditionModelId;
  let conditionModifiedDate: string | null = initialConditionModifiedDate;
  let conditionName: string = initialConditionName;
  let saveButtonEnabled: boolean = false;
  let specId: number | null = initialSpecId;
  let savedSpecId: number | null = initialSpecId;
  let savedCondition: Partial<SchedulingCondition> = {
    definition: conditionDefinition,
    description: conditionDescription,
    model_id: conditionModelId,
    name: conditionName,
  };

  $: planOptions = plans
    .filter(plan => plan.model_id === conditionModelId)
    .map(({ id, name, scheduling_specifications }) => ({
      id,
      name,
      specId: (scheduling_specifications && scheduling_specifications[0]?.id) || null,
    }));
  $: specId = planOptions.some(plan => plan.specId === specId) ? specId : null; // Null the specId value if the filtered plan list no longer includes the chosen spec

  $: saveButtonEnabled =
    conditionDefinition !== '' && conditionModelId !== null && conditionName !== '' && specId !== null;
  $: conditionModified =
    diffConditions(savedCondition, {
      definition: conditionDefinition,
      description: conditionDescription,
      model_id: conditionModelId,
      name: conditionName,
    }) || specId !== savedSpecId;
  $: saveButtonText = mode === 'edit' && !conditionModified ? 'Saved' : 'Save';
  $: saveButtonClass = conditionModified && saveButtonEnabled ? 'primary' : 'secondary';

  function diffConditions(conditionA: Partial<SchedulingCondition>, conditionB: Partial<SchedulingCondition>) {
    return Object.entries(conditionA).some(([key, value]) => {
      return conditionB[key] !== value;
    });
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    conditionDefinition = value;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      saveCondition();
    }
  }

  async function saveCondition() {
    if (saveButtonEnabled) {
      if (mode === 'create') {
        const newCondition = await effects.createSchedulingCondition(
          conditionDefinition,
          conditionDescription,
          conditionName,
          $userStore?.id,
          conditionModelId,
        );

        if (newCondition !== null) {
          const { id: newConditionId } = newCondition;

          const specConditionInsertInput: SchedulingSpecConditionInsertInput = {
            condition_id: newConditionId,
            enabled: true,
            specification_id: specId,
          };
          await effects.createSchedulingSpecCondition(specConditionInsertInput);

          goto(`${base}/scheduling/conditions/edit/${newConditionId}`);
        }
      } else if (mode === 'edit') {
        const condition: Partial<SchedulingCondition> = {
          definition: conditionDefinition,
          description: conditionDescription,
          model_id: conditionModelId,
          name: conditionName,
        };
        const updatedCondition = await effects.updateSchedulingCondition(conditionId, condition);
        if (updatedCondition) {
          if (specId !== savedSpecId) {
            await effects.updateSchedulingSpecConditionId(conditionId, savedSpecId, specId);
            savedSpecId = specId;
          }

          conditionModifiedDate = updatedCondition.modified_date;
          savedCondition = { ...condition };
        }
      }
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<CssGrid bind:columns={$schedulingColumns}>
  <Panel overflowYBody="hidden" padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>{mode === 'create' ? 'New Scheduling Condition' : 'Edit Scheduling Condition'}</SectionTitle>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/scheduling/conditions`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button
          class="st-button {saveButtonClass} ellipsis"
          disabled={!saveButtonEnabled}
          on:click|stopPropagation={saveCondition}
        >
          {saveButtonText}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if mode === 'edit'}
        <fieldset>
          <label for="conditionId">Condition ID</label>
          <input class="st-input w-100" disabled name="conditionId" value={conditionId} />
        </fieldset>

        <fieldset>
          <label for="createdAt">Created At</label>
          <input class="st-input w-100" disabled name="createdAt" value={conditionCreatedDate} />
        </fieldset>

        <fieldset>
          <label for="updatedAt">Updated At</label>
          <input class="st-input w-100" disabled name="updatedAt" value={conditionModifiedDate} />
        </fieldset>

        <fieldset>
          <label for="author">Original Author</label>
          <input class="st-input w-100" disabled name="author" value={conditionAuthor} />
        </fieldset>
      {/if}

      <fieldset>
        <label for="model">Model</label>
        <select bind:value={conditionModelId} class="st-select w-100" name="model">
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
        <select bind:value={specId} class="st-select w-100" name="plan">
          <option value={null} />
          {#each planOptions as plan}
            <option value={plan.specId} disabled={!plan.specId}>
              {plan.name} ({plan.id}) {#if plan.specId === null} (Missing Scheduling Specification) {/if}
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="condition-name">Name</label>
        <input
          bind:value={conditionName}
          autocomplete="off"
          class="st-input w-100"
          name="condition-name"
          placeholder="Enter Condition Name (required)"
          required
        />
      </fieldset>

      <fieldset>
        <label for="condition-description">Description</label>
        <textarea
          bind:value={conditionDescription}
          autocomplete="off"
          class="st-input w-100"
          name="condition-description"
          placeholder="Enter Condition Description (optional)"
        />
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <SchedulingEditor
    scheduleItemDefinition={conditionDefinition}
    scheduleItemModelId={conditionModelId}
    title="{mode === 'create' ? 'New' : 'Edit'} Scheduling Condition - Definition Editor"
    on:didChangeModelContent={onDidChangeModelContent}
  />
</CssGrid>
