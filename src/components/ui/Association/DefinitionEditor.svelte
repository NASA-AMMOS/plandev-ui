<svelte:options immutable={true} />

<script lang="ts">
  import type { editor as Editor, languages } from 'monaco-editor/esm/vs/editor/editor.api';
  import { createEventDispatcher } from 'svelte';
  import { DefinitionType } from '../../../enums/association';
  import { models } from '../../../stores/model';
  import type { DropdownOptions, SelectedDropdownOptionValue } from '../../../types/dropdown';
  import type { Monaco, TypeScriptFile } from '../../../types/monaco';
  import MonacoEditor from '../../ui/MonacoEditor.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SearchableDropdown from '../../ui/SearchableDropdown.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';

  export let tsFiles: TypeScriptFile[] = [];
  export let definition: string | null = '';
  export let definitionType: DefinitionType = DefinitionType.CODE;
  export let referenceModelId: number | null = null;
  export let readOnly: boolean = false;
  export let title: string = 'Constraint - Definition Editor';

  const dispatch = createEventDispatcher<{
    selectReferenceModel: number | null;
  }>();

  let modelOptions: DropdownOptions = [];
  let monaco: Monaco;
  let worker: languages.typescript.TypeScriptWorker | null = null;

  $: modelOptions = $models.map(({ id, name, version }) => ({
    display: `${name} (Version: ${version})`,
    hasSelectPermission: true,
    value: id,
  }));

  $: if (monaco !== undefined) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();

    typescriptDefaults.setCompilerOptions({ ...options, lib: ['esnext'], strictNullChecks: true });
  }

  $: if (monaco !== undefined && tsFiles !== undefined && worker != null) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    typescriptDefaults.setExtraLibs(tsFiles);
  }

  function workerFullyLoaded(
    event: CustomEvent<{
      editor: Editor.IStandaloneCodeEditor;
      model: Editor.ITextModel;
      worker: languages.typescript.TypeScriptWorker;
    }>,
  ) {
    const { worker: eventWorker } = event.detail;
    worker = eventWorker;
  }

  function onSelectReferenceModel(event: CustomEvent<SelectedDropdownOptionValue>) {
    const { detail: modelId } = event;
    if (modelId === null) {
      dispatch('selectReferenceModel', modelId);
    } else {
      dispatch('selectReferenceModel', parseInt(`${modelId}`));
    }
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
    {#if definitionType === DefinitionType.CODE}
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
        value={definition}
        on:didChangeModelContent
        on:fullyLoaded={workerFullyLoaded}
      />
    {:else}
      <div class="file-message st-typography-bold">Preview not available for definitions from a file.</div>
    {/if}
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

  .file-message {
    align-items: center;
    display: grid;
    height: 100%;
    justify-content: center;
    width: 100%;
  }
</style>
