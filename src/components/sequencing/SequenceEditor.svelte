<svelte:options immutable={true} />

<script lang="ts">
  import type { CommandDictionary as AmpcsCommandDictionary } from '@nasa-jpl/aerie-ampcs';
  import type { editor as Editor, languages } from 'monaco-editor/esm/vs/editor/editor.api';
  import { createEventDispatcher } from 'svelte';
  import { userSequencesRows } from '../../stores/sequencing';
  import type { User } from '../../types/app';
  import type { Monaco, TypeScriptFile } from '../../types/monaco';
  import effects from '../../utilities/effects';
  import { sequenceProvideCodeActions } from '../../utilities/monacoHelper';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let disableSeqJSONGeneration: boolean = false;
  export let readOnly: boolean = false;
  export let sequenceCommandDictionaryId: number | null = null;
  export let sequenceDefinition: string = '';
  export let sequenceName: string = '';
  export let sequenceSeqJson: string = '';
  export let title: string = 'Sequence - Definition Editor';
  export let user: User | null;

  const dispatch = createEventDispatcher();

  let commandDictionaryJson: AmpcsCommandDictionary | null = null;
  let commandDictionaryTsFiles: TypeScriptFile[] = [];
  let monaco: Monaco;
  let editor: Editor.IStandaloneCodeEditor;
  let sequenceEditorModel: Editor.ITextModel;

  $: effects
    .getTsFilesCommandDictionary(sequenceCommandDictionaryId, user)
    .then(tsFiles => (commandDictionaryTsFiles = tsFiles));

  $: effects
    .getParsedAmpcsCommandDictionary(sequenceCommandDictionaryId, user)
    .then(parsedDictionary => (commandDictionaryJson = parsedDictionary));

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

  $: if (monaco !== undefined && commandDictionaryJson !== undefined) {
    workerUpdateModel();
  }

  function downloadSeqJson() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([sequenceSeqJson], { type: 'application/json' }));
    a.download = sequenceName;
    a.click();
  }

  function editorCreated(event: CustomEvent<Editor.IStandaloneCodeEditor>) {
    editor = event.detail;
  }

  function workerFullyLoaded(
    event: CustomEvent<{ model: Editor.ITextModel; worker: languages.typescript.TypeScriptWorker }>,
  ) {
    const { model, worker } = event.detail;
    const model_id = model.id;

    worker.updateModelConfig({
      command_dict_str: JSON.stringify(commandDictionaryJson ?? {}),
      model_id,
      should_inject: true,
    });
  }

  /**
   * Used to update the custom worker to use the selected command dictionary.
   */
  async function workerUpdateModel() {
    if (editor) {
      try {
        /**
         * We don't have a way to check if the editor is initialized or not so it was throwing a "typescript not registered"
         * error here. This is a hacky workaround to see if the editor is ready and we can load the typescript worker.
         * :woozy:
         *
         * https://github.com/microsoft/monaco-editor/issues/115
         */
        editor.onDidScrollChange(async () => {
          const tsWorker = await monaco.languages.typescript.getTypeScriptWorker();
          const worker = await tsWorker();

          if (commandDictionaryJson && sequenceEditorModel) {
            worker.updateModelConfig({
              command_dict_str: JSON.stringify(commandDictionaryJson ?? {}),
              model_id: sequenceEditorModel.id,
              should_inject: true,
            });
          }
        });
      } catch (reason) {
        console.log('Failed to pass the command dictionary to the custom worker.', reason);
      }
    }
  }
</script>

<CssGrid bind:rows={$userSequencesRows}>
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
        bind:model={sequenceEditorModel}
        automaticLayout={true}
        actionProvider={sequenceProvideCodeActions}
        fixedOverflowWidgets={true}
        language="typescript"
        lineNumbers="on"
        minimap={{ enabled: false }}
        {readOnly}
        scrollBeyondLastLine={false}
        tabSize={2}
        value={sequenceDefinition}
        on:didChangeModelContent
        on:editor={editorCreated}
        on:fullyLoaded={workerFullyLoaded}
      />
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="row" />

  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Seq JSON (Read-only)</SectionTitle>

      <div class="right">
        {#if !disableSeqJSONGeneration}
          <button class="st-button secondary ellipsis" on:click={() => dispatch('generate')}>Generate</button>
        {/if}
        <button class="st-button secondary ellipsis" on:click={downloadSeqJson}>Download</button>
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
