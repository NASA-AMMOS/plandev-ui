<svelte:options immutable={true} />

<script lang="ts">
  import { json } from '@codemirror/lang-json';
  import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
  import { MergeView } from '@codemirror/merge';
  import { EditorState, type Extension } from '@codemirror/state';
  import { EditorView, lineNumbers } from '@codemirror/view';
  import { basicSetup } from 'codemirror';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { WorkspaceContentType } from '../../enums/workspace';
  import { readOnlyChangeGuard } from '../../utilities/codemirror/readOnly';
  import { getShortISOForDate } from '../../utilities/time';
  import { getUserDisplayNameFromIdentity } from '../../utilities/workspaces';

  /**
   * When true, the "Mine" pane is editable with revert chevrons to pull in "Theirs" — a
   * hand-merge. Read the result via {@link getMergedContent}. Ignored when `theirs` is null.
   */
  export let editable: boolean = false;
  /** Language extension for syntax highlighting; falls back to a `type`-based one (JSON). */
  export let languageExtension: Extension | null = null;
  /** The editor buffer ("Mine"); always shown. */
  export let mine: string;
  /** Subtext under the "Mine" header, e.g. who last edited it and when. */
  export let mineEditBy: string | null = null;
  export let mineEditedAt: string | null = null;
  /** Header over the "Mine" pane; defaults to the save-conflict wording. */
  export let mineLabel: string | null = null;
  /** Current server content ("Theirs"). When null the file was deleted — "Mine" shows alone. */
  export let theirs: string | null;
  /** Subtext under the "Theirs" header, e.g. who last edited it and when. */
  export let theirsEditBy: string | null = null;
  export let theirsEditedAt: string | null = null;
  /** Header over the "Theirs" pane. */
  export let theirsLabel: string = 'Theirs (server)';
  /** File type, used to pick the fallback language extension. */
  export let type: WorkspaceContentType | null = null;

  const dispatch = createEventDispatcher<{ stats: { changedLines: number } }>();

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

  /** Total lines involved in changes (larger side of each chunk), for the header summary. */
  function countChangedLines(view: MergeView): number {
    const aDoc = view.a.state.doc;
    const bDoc = view.b.state.doc;
    let total = 0;
    for (const chunk of view.chunks) {
      const aLines = chunk.toA > chunk.fromA ? aDoc.lineAt(chunk.endA).number - aDoc.lineAt(chunk.fromA).number + 1 : 0;
      const bLines = chunk.toB > chunk.fromB ? bDoc.lineAt(chunk.endB).number - bDoc.lineAt(chunk.fromB).number + 1 : 0;
      total += Math.max(aLines, bLines);
    }
    return total;
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

    dispatch('stats', { changedLines: countChangedLines(mergeView) });
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
      <div class="px-3 py-1.5">
        <div class="flex flex-col gap-1">
          <div class="grid grid-cols-[1fr_auto] items-center justify-center gap-2">
            <span class="overflow-hidden text-ellipsis" title={theirsLabel}>{theirsLabel}</span>
            <slot name="theirs-header-slot" />
          </div>
          {#if theirsEditBy || theirsEditedAt}
            <div class="flex gap-1 text-nowrap text-xs text-muted-foreground">
              <span>Edited by: {getUserDisplayNameFromIdentity(theirsEditBy || '')}</span>{#if theirsEditedAt}
                <span>@{getShortISOForDate(new Date(theirsEditedAt || ''))}</span>{/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
    <div class="border-l px-3 py-1.5">
      <div class="flex flex-col gap-1">
        <div class="grid grid-cols-[1fr_auto] items-center justify-center gap-2">
          <span
            class="overflow-hidden text-ellipsis"
            title={mineLabel ?? (editable ? 'Mine (editable)' : 'Mine (your edits)')}
          >
            {mineLabel ?? (editable ? 'Mine (editable)' : 'Mine (your edits)')}
          </span>
          <slot name="mine-header-slot" />
        </div>
        {#if mineEditBy || mineEditedAt}
          <div class="flex gap-1 text-nowrap text-xs text-muted-foreground">
            <span>Edited by: {getUserDisplayNameFromIdentity(mineEditBy || '')}</span>{#if mineEditedAt}
              <span>@{getShortISOForDate(new Date(mineEditedAt || ''))}</span>{/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
  <!-- Scroll the whole diff here so both panes stay aligned (MergeView's recommended setup). -->
  <div class="min-h-0 flex-auto overflow-auto" bind:this={container} />
</div>
