<svelte:options immutable={true} />

<script lang="ts">
  import Chip from '../ui/Chip.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';

  export let activityTypeScript: string = '';
  export let commandTypeScript: string = '';
  export let ruleLogic: string = '';

  let monaco: Monaco;

  $: if (monaco !== undefined && (commandTypeScript !== undefined || activityTypeScript !== undefined)) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();

    typescriptDefaults.setCompilerOptions({ ...options, lib: ['ESNext'], strictNullChecks: true });
    typescriptDefaults.setExtraLibs([
      { content: commandTypeScript, filePath: 'command-dictionary.d.ts' },
      { content: activityTypeScript, filePath: 'activity.d.ts' },
    ]);
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <Chip>Expansion Logic Editor</Chip>

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
      scrollBeyondLastLine={false}
      value={ruleLogic}
      on:didChangeModelContent
    />
  </svelte:fragment>
</Panel>
