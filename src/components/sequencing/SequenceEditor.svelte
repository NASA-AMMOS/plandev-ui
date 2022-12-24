<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { userSequencesRows } from '../../stores/sequencing';
  import type { Monaco, TypeScriptFile } from '../../types/monaco';
  import effects from '../../utilities/effects';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';

  export let readOnly: boolean = false;
  export let sequenceCommandDictionaryId: number | null = null;
  export let sequenceDefinition: string = '';
  export let sequenceName: string = '';
  export let sequenceSeqJson: string = '';
  export let title: string = 'Sequence - Definition Editor';

  const dispatch = createEventDispatcher();

  let commandDictionaryTsFiles: TypeScriptFile[] = [];
  let monaco: Monaco;

  $: effects
    .getTsFilesCommandDictionary(sequenceCommandDictionaryId)
    .then(tsFiles => (commandDictionaryTsFiles = tsFiles));

  $: if (monaco !== undefined) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();
    typescriptDefaults.setCompilerOptions({ ...options, lib: ['esnext'], strictNullChecks: true });
  }

  $: if (monaco !== undefined && commandDictionaryTsFiles !== undefined) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    typescriptDefaults.setExtraLibs(commandDictionaryTsFiles);
  }

  function downloadSeqJson() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([sequenceSeqJson], { type: 'application/json' }));
    a.download = sequenceName;
    a.click();
  }
</script>

<CssGrid bind:rows={$userSequencesRows}>
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
        tabSize={2}
        value={sequenceDefinition}
        on:didChangeModelContent
      />
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="row" />

  <Panel>
    <svelte:fragment slot="header">
      <Chip>Seq JSON (Read-only)</Chip>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => dispatch('generate')}> Generate </button>
        <button class="st-button secondary ellipsis" on:click={downloadSeqJson}> Download </button>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="body">
      <MonacoEditor
        automaticLayout={true}
        fixedOverflowWidgets={true}
        language="json"
        lineNumbers="on"
        minimap={{ enabled: false }}
        readOnly={true}
        scrollBeyondLastLine={true}
        tabSize={2}
        value={sequenceSeqJson}
      />
    </svelte:fragment>
  </Panel>
</CssGrid>
