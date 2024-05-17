<svelte:options immutable={true} />

<script lang="ts">
  import type { CommandDictionary as AmpcsCommandDictionary } from '@nasa-jpl/aerie-ampcs';
  import type { editor as Editor, languages } from 'monaco-editor/esm/vs/editor/editor.api';
  import { parcelBundles } from '../../stores/sequencing';
  import type { User } from '../../types/app';
  import type { Monaco, TypeScriptFile } from '../../types/monaco';
  import effects from '../../utilities/effects';
  import { sequenceProvideCodeActions } from '../../utilities/monacoHelper';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let readOnly: boolean = false;
  export let ruleActivityType: string | null = null;
  export let parcelId: number | null = null;
  export let ruleLogic: string = '';
  export let ruleModelId: number | null = null;
  export let title: string = 'Expansion Rule - Logic Editor';
  export let user: User | null;

  let activityTypeTsFiles: TypeScriptFile[] = [];
  let commandDictionaryJson: AmpcsCommandDictionary | null = null;
  let commandDictionaryTsFiles: TypeScriptFile[] = [];
  let editorModel: Editor.ITextModel;
  let monaco: Monaco;

  $: effects
    .getTsFilesCommandDictionary($parcelBundles.find(bundle => bundle.id === parcelId)?.command_dictionary_id, user)
    .then(tsFiles => {
      commandDictionaryTsFiles = tsFiles;
    });

  $: effects
    .getTsFilesActivityType(ruleActivityType, ruleModelId, user)
    .then(tsFiles => (activityTypeTsFiles = tsFiles));

  $: effects
    .getParsedAmpcsCommandDictionary($parcelBundles.find(bundle => bundle.id === parcelId)?.command_dictionary_id, user)
    .then(parsedDictionary => (commandDictionaryJson = parsedDictionary));

  $: if (monaco !== undefined) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();
    typescriptDefaults.setCompilerOptions({ ...options, lib: ['esnext'], strictNullChecks: true });
  }

  $: if (monaco && commandDictionaryTsFiles && activityTypeTsFiles) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    typescriptDefaults.setExtraLibs([...commandDictionaryTsFiles, ...activityTypeTsFiles]);
  }

  $: if (monaco !== undefined && commandDictionaryJson !== undefined) {
    workerUpdateModel();
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
    try {
      const tsWorker = await monaco.languages.typescript.getTypeScriptWorker();
      const worker = await tsWorker();

      if (commandDictionaryJson && editorModel) {
        worker.updateModelConfig({
          command_dict_str: JSON.stringify(commandDictionaryJson ?? {}),
          model_id: editorModel.id,
          should_inject: true,
        });
      }
    } catch (reason) {
      console.log('Failed to pass the command dictionary to the custom worker.', reason);
    }
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
      bind:model={editorModel}
      automaticLayout={true}
      actionProvider={sequenceProvideCodeActions}
      fixedOverflowWidgets={true}
      language="typescript"
      lineNumbers="on"
      minimap={{ enabled: false }}
      {readOnly}
      scrollBeyondLastLine={false}
      tabSize={2}
      value={ruleLogic}
      on:didChangeModelContent
      on:fullyLoaded={workerFullyLoaded}
    />
  </svelte:fragment>
</Panel>
