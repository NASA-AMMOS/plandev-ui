<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { planReadOnly } from '../../stores/plan';
  import { simulationTemplates } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type {
    DropdownOption,
    DropdownOptions,
    DropdownOptionValue,
    SelectedDropdownOptionValue,
  } from '../../types/dropdown';
  import type { Plan } from '../../types/plan';
  import type { SimulationTemplate } from '../../types/simulation';
  import { featurePermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import EditableDropdown from '../ui/EditableDropdown.svelte';

  export let disabled: boolean = false;
  export let hasChanges: boolean = false;
  export let selectedSimulationTemplate: SimulationTemplate | null | undefined;
  export let plan: Plan | null;
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    applyTemplate: SimulationTemplate | null;
    deleteTemplate: SimulationTemplate;
    saveNewTemplate: Pick<SimulationTemplate, 'description'>;
    saveTemplate: Pick<SimulationTemplate, 'description'>;
  }>();

  let hasAssignPermission: boolean = false;
  let hasCreatePermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let hasUpdatePermission: boolean = false;
  let options: DropdownOptions = [];

  $: options = $simulationTemplates.map((simulationTemplate: SimulationTemplate) => ({
    display: simulationTemplate.description,
    hasSelectPermission: hasAssignPermission,
    value: simulationTemplate.id,
  }));
  $: if (plan !== null) {
    hasAssignPermission = featurePermissions.simulationTemplates.canAssign(user, plan) && !$planReadOnly;
    // because we also assign after template creation, we must include both checks here as part of the creation permission check
    hasCreatePermission =
      featurePermissions.simulationTemplates.canCreate(user, plan) &&
      featurePermissions.simulationTemplates.canAssign(user, plan) &&
      !$planReadOnly;

    const selectedTemplate = $simulationTemplates.find(
      simulationTemplate => simulationTemplate.id === selectedSimulationTemplate?.id,
    );
    if (selectedTemplate !== undefined) {
      hasDeletePermission =
        featurePermissions.simulationTemplates.canDelete(user, plan, selectedTemplate) && !$planReadOnly;
      hasUpdatePermission =
        featurePermissions.simulationTemplates.canUpdate(user, plan, selectedTemplate) && !$planReadOnly;
    }
  }

  function onDeleteTemplate(event: CustomEvent<DropdownOptionValue>) {
    const { detail: templateId } = event;
    const deletedSimulationTemplate = $simulationTemplates.find(
      simulationTemplate => simulationTemplate.id === templateId,
    );
    if (deletedSimulationTemplate) {
      dispatch('deleteTemplate', deletedSimulationTemplate);
    }
  }

  function onSaveNewTemplate(event: CustomEvent<string>) {
    const { detail: templateName } = event;
    dispatch('saveNewTemplate', { description: templateName });
  }

  function onSaveTemplate(event: CustomEvent<DropdownOption>) {
    const { detail: template } = event;
    dispatch('saveTemplate', { description: template.display });
  }

  function onApplyTemplate(event: CustomEvent<SelectedDropdownOptionValue>) {
    const { detail: simulationTemplateId } = event;
    const templateToApply = $simulationTemplates.find(template => template.id === simulationTemplateId);
    dispatch('applyTemplate', templateToApply ?? null);
  }
</script>

<div class="simulation-template-input-container">
  <div class="template-input-container st-input w-100">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label class="label" use:tooltip={{ content: 'Choose simulation template', placement: 'top' }}>
      Simulation Template
    </label>
    <EditableDropdown
      {disabled}
      canSaveOver={hasChanges}
      {hasCreatePermission}
      {hasDeletePermission}
      {hasUpdatePermission}
      {options}
      optionLabel="template"
      placeholder="None"
      planReadOnly={$planReadOnly}
      selectedOptionValue={selectedSimulationTemplate?.id}
      showPlaceholderOption={hasAssignPermission}
      on:deleteOption={onDeleteTemplate}
      on:saveNewOption={onSaveNewTemplate}
      on:saveOption={onSaveTemplate}
      on:selectOption={onApplyTemplate}
    />
  </div>
</div>

<style>
  .simulation-template-input-container {
    --aerie-menu-item-template-columns: 1fr;
    align-items: center;
    display: grid;
  }

  .template-input-container {
    display: grid;
    grid-template-rows: repeat(2, min-content);
    position: relative;
    row-gap: 4px;
  }
</style>
