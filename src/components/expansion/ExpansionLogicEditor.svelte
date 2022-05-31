<svelte:options immutable={true} />

<script lang="ts">
  import effects from '../../utilities/effects';
  import Chip from '../ui/Chip.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';

  export let readOnly: boolean = false;
  export let ruleActivityType: string | null = null;
  export let ruleDictionaryId: number | null = null;
  export let ruleLogic: string = '';
  export let ruleModelId: number | null = null;
  export let title: string = 'Expansion Rule - Logic Editor';

  let activityTypeScript: string = '';
  let commandTypeScript: string = '';
  let monaco: Monaco;

  $: effects.getCommandTypeScript(ruleDictionaryId).then(typeScript => (commandTypeScript = typeScript));
  $: effects.getActivityTypeScript(ruleActivityType, ruleModelId).then(typeScript => (activityTypeScript = typeScript));

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
    <Chip>{title}</Chip>

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
      value={ruleLogic}
      on:didChangeModelContent
    />
  </svelte:fragment>
</Panel>
