<svelte:options immutable={true} />

<script lang="ts">
  import type { PhoenixContext } from '@nasa-jpl/plandev-sequence-languages';
  import { EditorView } from 'codemirror';
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../enums/workspace';
  import { activeDocument, activeDocumentIsDirty, activeDocumentPath } from '../../stores/activeDocument';
  import { sequenceAdaptation } from '../../stores/sequence-adaptation';
  import type { ActionDefinition } from '../../types/actions';
  import type { LintDiagnostic } from '../../types/console';
  import type { WorkspaceFileRevision, WorkspaceRevisionName } from '../../types/workspace';
  import type { WorkspaceFileMetadata, WorkspaceTreeMap } from '../../types/workspace-tree-view';
  import { doesFilenameMatchExtension } from '../../utilities/workspaces';
  import SequenceEditor from '../sequencing/SequenceEditor.svelte';
  import TextEditor from '../ui/TextEditor.svelte';

  export let availableActions: { action: ActionDefinition; parameter: string }[] = [];
  export let doesWorkingCopyMatchLatestRevision: boolean = false;
  export let includeActions: boolean = false;
  export let isLoading: boolean = false;
  export let isTextOrEmpty: boolean = false;
  export let matchingRevisionName: WorkspaceRevisionName | null = null;
  export let phoenixContext: PhoenixContext | undefined;
  export let preserveAdaptationLog: boolean = false;
  export let previewOnly: boolean = false;
  export let readOnly: boolean = false;
  export let revisionList: WorkspaceFileRevision[] = [];
  export let sequenceEditorRef: SequenceEditor;
  export let sequenceOutput: string | undefined = undefined;
  export let textEditorRef: TextEditor;
  export let workspaceTreeMap: WorkspaceTreeMap = {};
  export let onReadOnlyChange: ((readOnly: boolean) => void) | null = null;

  createEventDispatcher<{
    adaptationError: { error: Error; filePath: string };
    downloadInput: { filePath: string; filename: string };
    downloadOutput: { content: string; filePath: string; filename: string };
    editorViewChange: EditorView | null;
    lintChange: { diagnostics: LintDiagnostic[]; filePath: string };
    runAction: { action: ActionDefinition; parameter: string };
    save: string;
    sequenceInputUpdate: { filePath: string; input: string };
    sequenceOutputUpdate: { filePath: string; output?: string };
  }>();

  let activeFileMetadata: WorkspaceFileMetadata | null = null;
  let activeFileIsSequence: boolean = false;
  let activeFileIsInputSequence: boolean = false;

  $: activeFileMetadata = ($activeDocumentPath && workspaceTreeMap[$activeDocumentPath]?.metadata) || null;

  $: activeFileIsSequence =
    $activeDocumentPath === null ||
    ($activeDocument.type !== null && $activeDocument.type === WorkspaceContentType.Sequence);
  $: activeFileIsInputSequence =
    activeFileIsSequence &&
    (!$activeDocument.fileName ||
      (!!$activeDocument.fileName &&
        doesFilenameMatchExtension($sequenceAdaptation.input.fileExtension, $activeDocument.fileName)));
</script>

<div class="flex h-full">
  {#if isTextOrEmpty && activeFileIsSequence}
    <SequenceEditor
      bind:this={sequenceEditorRef}
      {phoenixContext}
      {availableActions}
      fileMetadata={activeFileMetadata}
      {includeActions}
      isDirty={$activeDocumentIsDirty}
      {isLoading}
      isInputFile={activeFileIsInputSequence}
      {doesWorkingCopyMatchLatestRevision}
      onReadOnlyChange={readOnly => onReadOnlyChange?.(readOnly)}
      {matchingRevisionName}
      {preserveAdaptationLog}
      {previewOnly}
      {readOnly}
      {revisionList}
      sequenceAdaptation={$sequenceAdaptation}
      sequenceDefinition={$activeDocument.originalContent}
      sequenceName={$activeDocument.fileName ?? ''}
      sequenceFilePath={$activeDocumentPath ?? ''}
      {sequenceOutput}
      shouldListenForKeyboardSave={false}
      showCommandFormBuilder={false}
      userSequenceEditorColumns="1fr"
      userSequenceEditorColumnsWithFormBuilder="1fr"
      on:adaptationError
      on:editorViewChange
      on:lintChange
      on:runAction
      on:save
      on:downloadInput
      on:downloadOutput
      on:sequenceInputUpdate
      on:sequenceOutputUpdate
    />
  {:else if isTextOrEmpty}
    <TextEditor
      bind:this={textEditorRef}
      {availableActions}
      fileMetadata={activeFileMetadata}
      includeActions={true}
      isJSON={$activeDocument.type === WorkspaceContentType.Json}
      {isLoading}
      {doesWorkingCopyMatchLatestRevision}
      isDirty={$activeDocumentIsDirty}
      onReadOnlyChange={readOnly => onReadOnlyChange?.(readOnly)}
      {previewOnly}
      {readOnly}
      {revisionList}
      shouldListenForKeyboardSave={false}
      textFileName={$activeDocument.fileName ?? ''}
      textFilePath={$activeDocumentPath ?? ''}
      textFileContent={$activeDocument.originalContent ?? ''}
      on:lintChange
      on:runAction
      on:save
      on:download
      on:textContentUpdated
    />
  {/if}
</div>
