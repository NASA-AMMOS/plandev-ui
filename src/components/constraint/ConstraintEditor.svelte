<svelte:options immutable={true} />

<script lang="ts">
  import { constraintsTsFiles, selectedConstraint } from '../../stores/constraints';
  import effects from '../../utilities/effects';
  import GridMenu from '../menus/GridMenu.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridId: number;

  let constraintType: ConstraintType = 'model';
  let definition: string = '';
  let description: string = '';
  let monaco: Monaco;
  let name: string = '';
  let summary: string = '';

  $: if ($selectedConstraint) {
    constraintType = $selectedConstraint.model_id ? 'model' : 'plan';
    definition = $selectedConstraint.definition;
    description = $selectedConstraint.description;
    name = $selectedConstraint.name;
    summary = $selectedConstraint.summary;
  } else {
    constraintType = 'model';
    definition = `export default (): Constraint => {\n\n}`;
    description = '';
    name = '';
    summary = '';
  }

  $: valid = definition !== '';

  $: if (monaco !== undefined && $constraintsTsFiles !== undefined) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();

    typescriptDefaults.setCompilerOptions({ ...options, lib: ['ESNext'], strictNullChecks: true });
    typescriptDefaults.setExtraLibs($constraintsTsFiles);
  }

  async function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    definition = value;
  }

  function saveConstraint() {
    if ($selectedConstraint) {
      effects.updateConstraint(constraintType, $selectedConstraint.id, definition, description, name, summary);
    } else {
      effects.createConstraint(constraintType, definition, description, name, summary);
    }
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Constraint Editor" />
    <div class="right">
      <button class="st-button secondary ellipsis" disabled={!valid} on:click={() => saveConstraint()}>
        <i class="bi bi-save" style="font-size: 0.8rem" />
        Save
      </button>
      <button class="st-button secondary ellipsis" on:click={() => ($selectedConstraint = null)}>
        <i class="bi bi-plus-square" style="font-size: 0.8rem" />
        New
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset>
      <label for="type">Type</label>
      <select bind:value={constraintType} class="st-select w-100" name="type">
        <option value="model">Model</option>
        <option value="plan">Plan</option>
      </select>
    </fieldset>

    <fieldset>
      <label for="name">Name</label>
      <input bind:value={name} autocomplete="off" class="st-input w-100" name="name" required />
    </fieldset>

    <fieldset>
      <label for="description">Description</label>
      <input bind:value={description} autocomplete="off" class="st-input w-100" name="description" />
    </fieldset>

    <fieldset>
      <label for="summary">Summary</label>
      <input bind:value={summary} autocomplete="off" class="st-input w-100" name="summary" />
    </fieldset>

    <MonacoEditor
      bind:monaco
      automaticLayout={true}
      language="typescript"
      lineNumbers="on"
      minimap={{ enabled: false }}
      scrollBeyondLastLine={false}
      tabSize={2}
      value={definition}
      on:didChangeModelContent={onDidChangeModelContent}
    />
  </svelte:fragment>
</Panel>

<style>
  .right {
    align-items: center;
    display: inline-flex;
    gap: 5px;
  }
</style>
