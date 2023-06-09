<svelte:options immutable={true} />

<script lang="ts">
  import type { User } from '../../types/app';
  import type { Monaco, TypeScriptFile } from '../../types/monaco';
  import effects from '../../utilities/effects';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let readOnly: boolean = false;
  export let ruleActivityType: string | null = null;
  export let ruleDictionaryId: number | null = null;
  export let ruleLogic: string = '';
  export let ruleModelId: number | null = null;
  export let title: string = 'Expansion Rule - Logic Editor';
  export let user: User | null;

  let activityTypeTsFiles: TypeScriptFile[] = [];
  let commandDictionaryTsFiles: TypeScriptFile[] = [];
  let monaco: Monaco;

  $: effects.getTsFilesCommandDictionary(ruleDictionaryId, user).then(tsFiles => (commandDictionaryTsFiles = tsFiles));
  $: effects
    .getTsFilesActivityType(ruleActivityType, ruleModelId, user)
    .then(tsFiles => (activityTypeTsFiles = tsFiles));

  $: if (monaco !== undefined && (commandDictionaryTsFiles !== undefined || activityTypeTsFiles !== undefined)) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();

    typescriptDefaults.setCompilerOptions({ ...options, lib: ['esnext'], strictNullChecks: true });
    typescriptDefaults.setExtraLibs([...commandDictionaryTsFiles, ...activityTypeTsFiles]);
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <SectionTitle>{title}</SectionTitle>

    <div class="right">
      <slot />
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
      value={ruleLogic}
      on:didChangeModelContent
    />
  </svelte:fragment>
</Panel>
