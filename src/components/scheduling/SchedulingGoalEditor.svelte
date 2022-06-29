<svelte:options immutable={true} />

<script lang="ts">
  import effects from '../../utilities/effects';
  import Chip from '../ui/Chip.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';

  export let goalDefinition: string = '';
  export let goalModelId: number | null = null;
  export let readOnly: boolean = false;
  export let title: string = 'Scheduling Goal - Definition Editor';

  let monaco: Monaco;
  let schedulingTsFiles: TypeScriptFile[];

  $: effects.getTsFilesScheduling(goalModelId).then(tsFiles => (schedulingTsFiles = tsFiles));

  $: if (monaco !== undefined && schedulingTsFiles !== undefined) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();

    typescriptDefaults.setCompilerOptions({ ...options, lib: ['ESNext'], strictNullChecks: true });
    typescriptDefaults.setExtraLibs(schedulingTsFiles);
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
      value={goalDefinition}
      on:didChangeModelContent
    />
  </svelte:fragment>
</Panel>
