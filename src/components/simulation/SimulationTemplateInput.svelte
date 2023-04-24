<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { simulationTemplates } from '../../stores/simulation';
  import type {
    DropdownOption,
    DropdownOptions,
    DropdownOptionValue,
    SelectedDropdownOptionValue,
  } from '../../types/dropdown';
  import type { SimulationTemplate } from '../../types/simulation';
  import { tooltip } from '../../utilities/tooltip';
  import EditableDropdown from '../ui/EditableDropdown.svelte';

  export let disabled: boolean = false;
  export let hasChanges: boolean = false;
  export let selectedSimulationTemplate: SimulationTemplate | null | undefined;

  const dispatch = createEventDispatcher();

  let options: DropdownOptions = [];

  $: options = $simulationTemplates.map((simulationTemplate: SimulationTemplate) => ({
    display: simulationTemplate.description,
    value: simulationTemplate.id,
  }));

  function onDeleteTemplate(event: CustomEvent<DropdownOptionValue>) {
    const { detail: templateId } = event;
    dispatch('deleteTemplate', templateId);
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
      {options}
      optionLabel="template"
      placeholder="None"
      selectedOptionValue={selectedSimulationTemplate?.id}
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
