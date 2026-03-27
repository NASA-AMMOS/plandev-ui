<svelte:options immutable={true} />

<script lang="ts">
  import { json, jsonParseLinter } from '@codemirror/lang-json';
  import { linter } from '@codemirror/lint';
  import { Compartment, EditorState, Transaction } from '@codemirror/state';
  import { EditorView } from '@codemirror/view';
  import { minimalSetup } from 'codemirror';
  import { createEventDispatcher, onDestroy } from 'svelte';
  import type { WorkspaceFileMetadata } from '../../types/workspace-tree-view';
  import { getShortISOForDate } from '../../utilities/time';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import PanelHeader from './PanelHeader.svelte';

  const dispatch = createEventDispatcher<{
    updateUserMetadata: Record<string, unknown>;
  }>();

  export let filePath: string | null = null;
  export let fileMetadata: WorkspaceFileMetadata | null = null;
  export let hasEditPermission: boolean = false;

  let editorView: EditorView | null = null;
  let compartmentReadonly: Compartment = new Compartment();
  let hasJsonError: boolean = false;
  let lastSavedContent: string = '';
  let previousFilePath: string | null = null;

  $: readOnly = !hasEditPermission;
  $: if (editorView && compartmentReadonly) {
    editorView.dispatch({
      effects: compartmentReadonly.reconfigure([EditorState.readOnly.of(readOnly)]),
    });
  }

  // Detect file switches and external metadata changes
  $: if (filePath !== previousFilePath) {
    tryAutoSave();
    previousFilePath = filePath;
    syncEditorContent(fileMetadata);
  } else if (fileMetadata) {
    const newContent = serializeUserMetadata(fileMetadata);
    if (editorView && newContent === lastSavedContent && editorView.state.doc.toString() !== newContent) {
      // Metadata was updated to match what we just saved (optimistic update) — skip
    } else if (newContent !== lastSavedContent) {
      syncEditorContent(fileMetadata);
    }
  }

  function serializeUserMetadata(metadata: WorkspaceFileMetadata | null): string {
    return metadata?.user ? JSON.stringify(metadata.user, null, 2) : '{}';
  }

  function syncEditorContent(metadata: WorkspaceFileMetadata | null) {
    const newContent = serializeUserMetadata(metadata);
    lastSavedContent = newContent;
    if (editorView && editorView.state.doc.toString() !== newContent) {
      editorView.dispatch({
        annotations: [Transaction.addToHistory.of(false)],
        changes: { from: 0, insert: newContent, to: editorView.state.doc.length },
      });
    }
  }

  function tryAutoSave() {
    if (!editorView || readOnly) {
      return;
    }
    const currentText = editorView.state.doc.toString();
    if (currentText === lastSavedContent) {
      return;
    }
    try {
      const parsed = JSON.parse(currentText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return;
      }
      lastSavedContent = currentText;
      dispatch('updateUserMetadata', parsed);
    } catch {
      // Invalid JSON — discard silently
    }
  }

  function isValidJsonObject(text: string): boolean {
    try {
      const parsed = JSON.parse(text);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }

  function updateValidationState(node: HTMLDivElement, text: string) {
    const isInvalid = text !== lastSavedContent && !isValidJsonObject(text);
    hasJsonError = isInvalid;
    if (isInvalid) {
      node.classList.add('invalid');
    } else {
      node.classList.remove('invalid');
    }
  }

  function initEditor(node: HTMLDivElement) {
    const initialContent = serializeUserMetadata(fileMetadata);
    lastSavedContent = initialContent;
    previousFilePath = filePath;

    editorView = new EditorView({
      doc: initialContent,
      extensions: [
        minimalSetup,
        json(),
        linter(jsonParseLinter()),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { fontSize: '11px' },
          '.cm-content': { fontFamily: 'monospace', padding: '4px 0' },
          '.cm-focused': { outline: 'none' },
          '.cm-scroller': { overflow: 'auto' },
        }),
        EditorView.updateListener.of(viewUpdate => {
          if (viewUpdate.docChanged) {
            updateValidationState(node, viewUpdate.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          blur: () => {
            tryAutoSave();
            return false;
          },
        }),
        compartmentReadonly.of([EditorState.readOnly.of(readOnly)]),
      ],
      parent: node,
    });

    return {
      destroy() {
        tryAutoSave();
        editorView?.destroy();
        editorView = null;
      },
    };
  }

  onDestroy(() => {
    tryAutoSave();
    editorView?.destroy();
    editorView = null;
  });
</script>

<div class="grid h-full grid-rows-[min-content_auto]">
  <Sidebar.Header className="p-0">
    <PanelHeader>
      <SectionTitle>Metadata</SectionTitle>
    </PanelHeader>
  </Sidebar.Header>
  <Sidebar.Content className="h-full">
    <Sidebar.Group className="h-full p-0">
      <Sidebar.GroupContent className="h-full">
        <Sidebar.Menu className="h-full text-xs">
          {#if fileMetadata}
            <div class="flex flex-col gap-4 p-3">
              {#if fileMetadata.createdBy}
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-muted-foreground">Created by</span>
                  <span>{fileMetadata.createdBy}</span>
                </div>
              {/if}
              {#if fileMetadata.createdAt}
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-muted-foreground">Created</span>
                  <span>{getShortISOForDate(new Date(fileMetadata.createdAt))}</span>
                </div>
              {/if}
              {#if fileMetadata.lastEditedBy}
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-muted-foreground">Last edited by</span>
                  <span>{fileMetadata.lastEditedBy}</span>
                </div>
              {/if}
              {#if fileMetadata.lastEditedAt}
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-muted-foreground">Last edited</span>
                  <span>{getShortISOForDate(new Date(fileMetadata.lastEditedAt))}</span>
                </div>
              {/if}
              {#if fileMetadata.version}
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium text-muted-foreground">Version</span>
                  <span>{fileMetadata.version}</span>
                </div>
              {/if}

              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-muted-foreground">User metadata</span>
                  {#if hasJsonError}
                    <span class="text-xxs text-destructive">Invalid JSON</span>
                  {/if}
                </div>
                <div class="user-metadata-editor overflow-hidden rounded border border-border" use:initEditor />
              </div>
            </div>
          {:else}
            <div class="p-3 text-muted-foreground">No metadata available for this file.</div>
          {/if}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</div>

<style>
  .user-metadata-editor :global(.cm-editor) {
    max-height: 300px;
  }

  .user-metadata-editor:global(.invalid) {
    border-color: hsl(var(--destructive));
  }
</style>
