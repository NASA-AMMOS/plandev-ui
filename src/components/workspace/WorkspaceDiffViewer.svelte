<svelte:options immutable={true} />

<script lang="ts">
  import { json } from '@codemirror/lang-json';
  import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
  import { MergeView } from '@codemirror/merge';
  import { EditorState, type Extension } from '@codemirror/state';
  import { EditorView, lineNumbers } from '@codemirror/view';
  import { basicSetup } from 'codemirror';
  import { onDestroy, onMount } from 'svelte';
  import { WorkspaceContentType } from '../../enums/workspace';
  import { readOnlyChangeGuard } from '../../utilities/codemirror/readOnly';

  /**
   * When true, the "Mine" pane is editable with revert chevrons to pull in "Theirs" — a
   * hand-merge. Read the result via {@link getMergedContent}. Ignored when `theirs` is null.
   */
  export let editable: boolean = false;
  /** Language extension for syntax highlighting; falls back to a `type`-based one (JSON). */
  export let languageExtension: Extension | null = null;
  /** The editor buffer ("Mine"); always shown. */
  export let mine: string;
  /** Current server content ("Theirs"). When null the file was deleted — "Mine" shows alone. */
  export let theirs: string | null;
  /** File type, used to pick the fallback language extension. */
  export let type: WorkspaceContentType | null = null;

  let container: HTMLDivElement;
  let isSinglePane: boolean = true;
  let mergeView: MergeView | null = null;
  let singleView: EditorView | null = null;

  $: isSinglePane = theirs === null;

  /** Get the current contents of the editable "Mine" pane (for the merge flow). */
  export function getMergedContent(): string {
    return mergeView?.b.state.doc.toString() ?? mine;
  }

  function languageExtensions(): Extension[] {
    if (languageExtension) {
      return [languageExtension];
    }
    if (type === WorkspaceContentType.Json) {
      return [json()];
    }
    return [];
  }

  // Blocks programmatic edits that `readOnly` codemirror flag misses
  // (lint quick-fixes, sanitizers), keeping the diff faithful to the bytes.
  // The theme hides the irrelevant lint quick-fix buttons.
  function readOnlyExtensions(): Extension[] {
    return [
      lineNumbers(),
      EditorView.lineWrapping,
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
      readOnlyChangeGuard(),
      EditorView.theme({ '.cm-diagnosticAction': { display: 'none' } }),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      ...languageExtensions(),
    ];
  }

  // Full editing surface for the "Mine" pane in merge mode — no read-only guard.
  function editableExtensions(): Extension[] {
    return [basicSetup, EditorView.lineWrapping, ...languageExtensions()];
  }

  function destroyViews() {
    mergeView?.destroy();
    mergeView = null;
    singleView?.destroy();
    singleView = null;
  }

  function buildViews() {
    destroyViews();
    if (!container) {
      return;
    }

    if (theirs === null) {
      singleView = new EditorView({
        doc: mine,
        extensions: readOnlyExtensions(),
        parent: container,
      });
      return;
    }

    const dividerTheme = EditorView.theme({ '&': { borderLeft: '1px solid hsl(var(--border))' } });

    // `a` = Theirs (read-only), `b` = Mine (editable in merge mode). revertControls are the
    // chevrons that copy Theirs chunks into Mine.
    mergeView = new MergeView({
      a: { doc: theirs, extensions: readOnlyExtensions() },
      b: { doc: mine, extensions: [...(editable ? editableExtensions() : readOnlyExtensions()), dividerTheme] },
      collapseUnchanged: { margin: 3, minSize: 4 },
      gutter: true,
      highlightChanges: true,
      parent: container,
      revertControls: editable ? 'a-to-b' : undefined,
    });
  }

  onMount(() => {
    buildViews();
  });

  onDestroy(() => {
    destroyViews();
  });
</script>

<div class="flex h-full min-h-0 w-full flex-col">
  <div
    class="st-typography-medium grid flex-none border-b"
    class:grid-cols-1={isSinglePane}
    class:grid-cols-2={!isSinglePane}
  >
    {#if !isSinglePane}
      <div class="border-r px-3 py-1.5 text-muted-foreground">Theirs (server)</div>
    {/if}
    <div class="px-3 py-1.5 text-muted-foreground">{editable ? 'Mine (editable)' : 'Mine (your edits)'}</div>
  </div>
  <!-- Scroll the whole diff here so both panes stay aligned (MergeView's recommended setup). -->
  <div class="min-h-0 flex-auto overflow-auto" bind:this={container} />
</div>
