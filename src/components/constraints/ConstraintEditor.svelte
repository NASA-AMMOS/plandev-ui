<svelte:options immutable={true} />

<script lang="ts">
  import effects from '../../utilities/effects';
  import Chip from '../ui/Chip.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';

  export let constraintDefinition: string = '';
  export let constraintModelId: number | null = null;
  export let readOnly: boolean = false;
  export let title: string = 'Constraint - Definition Editor';

  let constraintsTsFiles: TypeScriptFile[];
  let monaco: Monaco;

  $: effects.getTsFilesConstraints(constraintModelId).then(tsFiles => (constraintsTsFiles = tsFiles));

  $: if (monaco !== undefined && constraintsTsFiles !== undefined) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();

    typescriptDefaults.setCompilerOptions({ ...options, lib: ['ESNext'], strictNullChecks: true });
    typescriptDefaults.setExtraLibs(constraintsTsFiles);
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <Chip>{title}</Chip>
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
