<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { models } from '../../stores/plan';
  import type { User } from '../../types/app';
  import type { DropdownOptions, SelectedDropdownOptionValue } from '../../types/dropdown';
  import type { Monaco, TypeScriptFile } from '../../types/monaco';
  import effects from '../../utilities/effects';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let constraintDefinition: string = '';
  export let referenceModelId: number | null = null;
  export let readOnly: boolean = false;
  export let title: string = 'Constraint - Definition Editor';
  export let user: User | null;

  const dispatch = createEventDispatcher();

  let constraintsTsFiles: TypeScriptFile[];
  let modelOptions: DropdownOptions = [];
  let monaco: Monaco;

  $: modelOptions = $models.map(({ id, name, version }) => ({
    display: `${name} (Version: ${version})`,
    hasSelectPermission: true,
    value: id,
  }));

  $: if (referenceModelId !== null) {
    effects.getTsFilesConstraints(referenceModelId, user).then(tsFiles => (constraintsTsFiles = tsFiles));
  } else {
    constraintsTsFiles = [];
  }

  $: if (monaco !== undefined && constraintsTsFiles !== undefined) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();

    typescriptDefaults.setCompilerOptions({ ...options, lib: ['esnext'], strictNullChecks: true });
    typescriptDefaults.setExtraLibs(constraintsTsFiles);
  }

  function onSelectReferenceModel(event: CustomEvent<SelectedDropdownOptionValue>) {
    const { detail: modelId } = event;
    dispatch('selectReferenceModel', modelId);
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <SectionTitle>{title}</SectionTitle>
    <div class="dropdown-select">
      {#if !readOnly}
        <label for="models">Reference Model:</label>
        <SearchableDropdown
          selectedOptionValue={referenceModelId}
          placeholder="No Model"
          name="models"
          options={modelOptions}
          on:selectOption={onSelectReferenceModel}
        />
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <MonacoEditor
      bind:monaco
      automaticLayout={true}
      fixedOverflowWidgets={true}
      language="typescript"
      lineNumbers="on"
      minimap={{ enabled: false }}
      {readOnly}
      scrollBeyondLastLine={false}
      tabSize={2}
      value={constraintDefinition}
      on:didChangeModelContent
    />
  </svelte:fragment>
</Panel>

<style>
  .dropdown-select {
    align-items: center;
    column-gap: 0.5rem;
    display: grid;
    grid-template-columns: min-content auto;
  }

  .dropdown-select label {
    white-space: nowrap;
  }
</style>
