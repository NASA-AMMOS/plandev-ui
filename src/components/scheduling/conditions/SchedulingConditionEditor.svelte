<svelte:options immutable={true} />

<script lang="ts">
  import type { User } from '../../../types/app';
  import type { Monaco, TypeScriptFile } from '../../../types/monaco';
  import effects from '../../../utilities/effects';
  import MonacoEditor from '../../ui/MonacoEditor.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';

  export let conditionDefinition: string = '';
  export let conditionModelId: number | null = null;
  export let readOnly: boolean = false;
  export let title: string = 'Scheduling Condition - Definition Editor';
  export let user: User | null;

  let monaco: Monaco;
  let schedulingTsFiles: TypeScriptFile[];

  $: effects.getTsFilesScheduling(conditionModelId, user).then(tsFiles => (schedulingTsFiles = tsFiles));

  $: if (monaco !== undefined && schedulingTsFiles !== undefined) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();

    typescriptDefaults.setCompilerOptions({ ...options, lib: ['esnext'], strictNullChecks: true });
    typescriptDefaults.setExtraLibs(schedulingTsFiles);
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <SectionTitle>{title}</SectionTitle>
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
      value={conditionDefinition}
      on:didChangeModelContent
    />
  </svelte:fragment>
</Panel>
