<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { schedulingConditionsFormColumns } from '../../../stores/scheduling';
  import type { User } from '../../../types/app';
  import type { ModelSlim } from '../../../types/model';
  import type { PlanSchedulingSpec } from '../../../types/plan';
  import type { SchedulingCondition, SchedulingSpecConditionInsertInput } from '../../../types/scheduling';
  import effects from '../../../utilities/effects';
  import { isSaveEvent } from '../../../utilities/keyboardEvents';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions, isUserAdmin } from '../../../utilities/permissions';
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
  export let user: User | null;

  const permissionError = 'You do not have permission to edit this scheduling condition.';

  let conditionAuthor: string | null = initialConditionAuthor;
  let conditionCreatedDate: string | null = initialConditionCreatedDate;
  let conditionDefinition: string = initialConditionDefinition;
  let conditionDescription: string = initialConditionDescription;
  let conditionId: number | null = initialConditionId;
  let conditionModelId: number | null = initialConditionModelId;
  let conditionModifiedDate: string | null = initialConditionModifiedDate;
  let conditionName: string = initialConditionName;
  let hasAuthoringPermission: boolean = false;
  let hasPermission: boolean = false;
  let planOptions: (PlanSchedulingSpec & { specId: number | null })[] = [];
  let saveButtonEnabled: boolean = false;
  let specId: number | null = initialSpecId;
  let savedSpecId: number | null = initialSpecId;
  let savedCondition: Partial<SchedulingCondition> = {
    definition: conditionDefinition,
    description: conditionDescription,
    model_id: conditionModelId !== null ? conditionModelId : undefined,
    name: conditionName,
  };

  $: planOptions = plans
    .filter(plan => plan.model_id === conditionModelId)
    .map(({ scheduling_specifications, ...plan }) => ({
      ...plan,
      scheduling_specifications,
      specId: scheduling_specifications?.[0] ? scheduling_specifications[0].id : null,
    }));
  $: selectedPlan = planOptions.find(({ specId: planSpecId }) => planSpecId === specId);
  $: specId = planOptions.some(plan => plan.specId === specId) ? specId : null; // Null the specId value if the filtered plan list no longer includes the chosen spec

  $: hasAuthoringPermission = mode === 'edit' ? isUserAdmin(user) : true;
  $: if (user) {
    hasPermission = specId
      ? hasPlanPermission(planOptions.find(plan => plan.specId === specId)?.id, mode, user)
      : conditionModelId
      ? hasModelPermission(conditionModelId, mode, user)
      : hasAnyPlanPermission(mode, user);
  }
  $: saveButtonEnabled =
    conditionDefinition !== '' && conditionModelId !== null && conditionName !== '' && specId !== null;
  $: conditionModified =
    diffConditions(savedCondition, {
      definition: conditionDefinition,
      description: conditionDescription,
      ...(conditionModelId !== null ? { model_id: conditionModelId } : {}),
      name: conditionName,
    }) || specId !== savedSpecId;
  $: saveButtonText = mode === 'edit' && !conditionModified ? 'Saved' : 'Save';
  $: saveButtonClass = conditionModified && saveButtonEnabled ? 'primary' : 'secondary';

  function hasModelPermission(modelId: number, mode: 'create' | 'edit', user: User | null): boolean {
    const plansFromModel = plans.filter(plan => plan.model_id === modelId);
    return plansFromModel.some(plan => {
      return (
        (mode === 'create' && featurePermissions.schedulingConditions.canCreate(user, plan)) ||
        featurePermissions.schedulingConditions.canUpdate(user, plan)
      );
    });
  }

  function hasAnyPlanPermission(mode: 'create' | 'edit', user: User | null): boolean {
    return plans.some(plan => {
      return mode === 'create'
        ? featurePermissions.schedulingConditions.canCreate(user, plan)
        : featurePermissions.schedulingConditions.canUpdate(user, plan);
    });
  }

  function hasPlanPermission(planId: number | undefined, mode: 'create' | 'edit', user: User | null): boolean {
    const plan = plans.find(plan => plan.id === planId);
    if (plan) {
      return mode === 'create'
        ? featurePermissions.schedulingConditions.canCreate(user, plan)
        : featurePermissions.schedulingConditions.canUpdate(user, plan);
    }
    return false;
  }

  function diffConditions(conditionA: Partial<SchedulingCondition>, conditionB: Partial<SchedulingCondition>) {
    return Object.entries(conditionA).some(([key, value]) => {
      return conditionB[key as keyof SchedulingCondition] !== value;
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
        let newCondition: SchedulingCondition | null = null;
        if (conditionModelId !== null && selectedPlan) {
          newCondition = await effects.createSchedulingCondition(
            conditionDefinition,
            conditionName,
            conditionModelId,
            selectedPlan,
            user,
            conditionDescription,
          );
        }

        if (newCondition !== null && specId !== null) {
          const { id: newConditionId } = newCondition;

          const specConditionInsertInput: SchedulingSpecConditionInsertInput = {
            condition_id: newConditionId,
            enabled: true,
            specification_id: specId,
          };
          await effects.createSchedulingSpecCondition(specConditionInsertInput, user);

          goto(`${base}/scheduling/conditions/edit/${newConditionId}`);
        }
      } else if (mode === 'edit') {
        const condition: Partial<SchedulingCondition> = {
          definition: conditionDefinition,
          description: conditionDescription,
          ...(hasAuthoringPermission && conditionModelId !== null ? { model_id: conditionModelId } : {}),
          name: conditionName,
        };
        if (conditionId !== null && selectedPlan != null) {
          const updatedCondition = await effects.updateSchedulingCondition(conditionId, condition, selectedPlan, user);
          if (updatedCondition) {
            if (savedSpecId !== null && specId !== null && specId !== savedSpecId) {
              await effects.updateSchedulingSpecConditionId(conditionId, savedSpecId, specId, user);
              savedSpecId = specId;
            }

            conditionModifiedDate = updatedCondition.modified_date;
            savedCondition = { ...condition };
          }
        }
      }
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<CssGrid bind:columns={$schedulingConditionsFormColumns}>
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
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
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
        <select
          bind:value={conditionModelId}
          class="st-select w-100"
          name="model"
          use:permissionHandler={{
            hasPermission: hasAnyPlanPermission(mode, user) && hasAuthoringPermission,
            permissionError,
          }}
        >
          <option value={null} />
          {#each models as model}
            <option value={model.id} disabled={!hasModelPermission(model.id, mode, user)}>
              {model.name}
              (Version: {model.version})
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="plan">Plan</label>
        <select
          bind:value={specId}
          class="st-select w-100"
          name="plan"
          use:permissionHandler={{
            hasPermission: hasAnyPlanPermission(mode, user),
            permissionError,
          }}
        >
          <option value={null} />
          {#each planOptions as plan}
            <option value={plan.specId} disabled={plan.specId === null || !hasPlanPermission(plan.id, mode, user)}>
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
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
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
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <SchedulingEditor
    scheduleItemDefinition={conditionDefinition}
    scheduleItemModelId={conditionModelId}
    title="{mode === 'create' ? 'New' : 'Edit'} Scheduling Condition - Definition Editor"
    {user}
    readOnly={!hasPermission}
    on:didChangeModelContent={onDidChangeModelContent}
  />
</CssGrid>
