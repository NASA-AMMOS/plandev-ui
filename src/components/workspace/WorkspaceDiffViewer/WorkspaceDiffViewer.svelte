<svelte:options immutable={true} />

<script lang="ts">
  import { json } from '@codemirror/lang-json';
  import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
  import { MergeView } from '@codemirror/merge';
  import { EditorState, type Extension } from '@codemirror/state';
  import { EditorView, lineNumbers } from '@codemirror/view';
  import { Button, cn } from '@nasa-jpl/stellar-svelte';
  import { basicSetup } from 'codemirror';
  import { ArrowLeftRight } from 'lucide-svelte';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { DownloadMenuOption } from '../../../types/dropdown';
  import type { WorkspaceRevisionName } from '../../../types/workspace';
  import { readOnlyChangeGuard } from '../../../utilities/codemirror/readOnly';
  import { createUnifiedDiff } from '../../../utilities/codemirror/unifiedDiff';
  import { downloadBlob } from '../../../utilities/generic';
  import { cleanPath, getVersionedFileName } from '../../../utilities/workspaces';
  import DownloadMenu from '../../ui/DownloadMenu.svelte';
  import Tooltip from '../../ui/Tooltip.svelte';
  import WorkspaceDiffSideHeader from './WorkspaceDiffSideHeader.svelte';

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
  /** Workspace path of the "Mine" file, used to name it in the downloaded diff. */
  export let mineFilePath: string | null = null;
  /** Header over the "Mine" pane; defaults to the save-conflict wording. */
  export let mineLabel: string | null = null;
  /** Message to display in the "Mine" pane. */
  export let mineMessage: string | null = null;
  /** Revision shown in the "Mine" pane, used to version its name in the downloaded diff; null for a working copy. */
  export let mineRevisionName: WorkspaceRevisionName | null = null;
  /** Current server content ("Theirs"). When null the file was deleted — "Mine" shows alone. */
  export let theirs: string | null;
  /** Subtext under the "Theirs" header, e.g. who last edited it and when. */
  export let theirsEditBy: string | null = null;
  export let theirsEditedAt: string | null = null;
  /** Workspace path of the "Theirs" file, used to name it in the downloaded diff. */
  export let theirsFilePath: string | null = null;
  /** Header over the "Theirs" pane. */
  export let theirsLabel: string = 'Theirs (server)';
  /** Message to display in the "Theirs" pane. */
  export let theirsMessage: string | null = null;
  /** Revision shown in the "Theirs" pane, used to version its name in the downloaded diff; null for a working copy. */
  export let theirsRevisionName: WorkspaceRevisionName | null = null;
  /** File type, used to pick the fallback language extension. */
  export let type: WorkspaceContentType | null = null;

  const dispatch = createEventDispatcher<{ stats: { changedLines: number } }>();

  let container: HTMLDivElement;
  let diffDownloadOptions: DownloadMenuOption[];
  let isSinglePane: boolean = true;
  let mergeView: MergeView | null = null;
  let resolvedMineLabel: string;
  let singleView: EditorView | null = null;
  /** When true, "Mine" is shown on the left and "Theirs" on the right. */
  let swapped: boolean = false;

  $: isSinglePane = theirs === null;
  $: resolvedMineLabel = mineLabel ?? (editable ? 'Mine (editable)' : 'Mine (your edits)');
  $: diffDownloadOptions = [
    {
      label: 'Download diff',
      name: getDiffFilename(
        { path: theirsFilePath, revisionName: theirsRevisionName },
        { path: mineFilePath, revisionName: mineRevisionName },
        swapped,
      ),
    },
  ];

  type DiffSide = { path: string | null; revisionName: WorkspaceRevisionName | null };

  function getDiffFilename(theirsSide: DiffSide, mineSide: DiffSide, isSwapped: boolean): string {
    const [leftSide, rightSide] = isSwapped ? [mineSide, theirsSide] : [theirsSide, mineSide];
    const left = getVersionedFileName(leftSide.path ?? '', leftSide.revisionName);
    const right = getVersionedFileName(rightSide.path ?? '', rightSide.revisionName);
    const isSameFile =
      cleanPath(leftSide.path) === cleanPath(rightSide.path) &&
      `${leftSide.revisionName ?? ''}` === `${rightSide.revisionName ?? ''}`;
    if (left && right && !isSameFile) {
      return `${left}_vs_${right}.diff`;
    }
    return `${left || right || 'changes'}.diff`;
  }

  /** Get the current contents of the editable "Mine" pane (for the merge flow). */
  export function getMergedContent(): string {
    return (swapped ? mergeView?.a : mergeView?.b)?.state.doc.toString() ?? mine;
  }

  function swapSides() {
    // Carry over any in-progress edits to "Mine" across the rebuild.
    const mineDoc = getMergedContent();
    swapped = !swapped;
    buildViews(mineDoc);
  }

  /** Downloads the current diff (including in-progress merge edits) as a unified diff, left side → right side. */
  function downloadDiff(name: string) {
    if (!mergeView) {
      return;
    }
    const theirsSide = { label: theirsLabel, path: theirsFilePath };
    const mineSide = { label: resolvedMineLabel, path: mineFilePath };
    const [left, right] = swapped ? [mineSide, theirsSide] : [theirsSide, mineSide];
    const diff = createUnifiedDiff(
      { doc: mergeView.a.state.doc, label: left.label, name: left.path ? `a/${cleanPath(left.path)}` : 'a' },
      { doc: mergeView.b.state.doc, label: right.label, name: right.path ? `b/${cleanPath(right.path)}` : 'b' },
      mergeView.chunks,
    );
    downloadBlob(new Blob([diff], { type: 'text/x-diff' }), name);
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

  function buildViews(mineDoc: string = mine) {
    destroyViews();
    if (!container) {
      return;
    }

    if (theirs === null) {
      singleView = new EditorView({
        doc: mineDoc,
        extensions: readOnlyExtensions(),
        parent: container,
      });
      return;
    }

    const dividerTheme = EditorView.theme({ '&': { borderLeft: '1px solid hsl(var(--border))' } });
    const theirsConfig = { doc: theirs, extensions: readOnlyExtensions() };
    const mineConfig = { doc: mineDoc, extensions: editable ? editableExtensions() : readOnlyExtensions() };
    const [left, right] = swapped ? [mineConfig, theirsConfig] : [theirsConfig, mineConfig];

    // `a` = left pane, `b` = right pane. Theirs is read-only, Mine is editable in merge mode.
    // revertControls are the chevrons that copy Theirs chunks into Mine.
    mergeView = new MergeView({
      a: left,
      b: { ...right, extensions: [...right.extensions, dividerTheme] },
      collapseUnchanged: { margin: 3, minSize: 4 },
      gutter: true,
      highlightChanges: true,
      parent: container,
      revertControls: editable ? (swapped ? 'b-to-a' : 'a-to-b') : undefined,
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
  <!-- Headers are positioned with CSS `order` so swapping doesn't re-render the slotted content. -->
  <div
    class="st-typography-medium relative grid border-b"
    class:grid-cols-1={isSinglePane}
    class:grid-cols-2={!isSinglePane}
  >
    {#if !isSinglePane}
      <WorkspaceDiffSideHeader
        editBy={theirsEditBy}
        editedAt={theirsEditedAt}
        label={theirsLabel}
        message={theirsMessage}
        className={cn(swapped ? 'order-2 border-l pl-10' : 'order-1 pr-10', 'min-h-[65px]')}
      >
        <slot name="theirs-header-slot" slot="header-slot" />
      </WorkspaceDiffSideHeader>
      <div class="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
        <Tooltip content="Swap sides">
          <Button
            class="h-6 w-6 bg-background text-muted-foreground"
            variant="outline"
            size="icon"
            aria-label="Swap sides"
            on:click={swapSides}
          >
            <ArrowLeftRight size={14} />
          </Button>
        </Tooltip>
        <DownloadMenu
          className="h-6 w-6 bg-background"
          size="icon"
          label="Download diff"
          options={diffDownloadOptions}
          on:download={e => downloadDiff(e.detail.name)}
        />
      </div>
    {/if}
    <WorkspaceDiffSideHeader
      editBy={mineEditBy}
      editedAt={mineEditedAt}
      label={resolvedMineLabel}
      message={mineMessage}
      className={isSinglePane ? '' : swapped ? 'order-1 pr-10' : 'order-2 border-l pl-10'}
    >
      <slot name="mine-header-slot" slot="header-slot" />
    </WorkspaceDiffSideHeader>
  </div>
  <!-- Scroll the whole diff here so both panes stay aligned (MergeView's recommended setup). -->
  <div class="min-h-0 flex-auto overflow-auto" bind:this={container} />
</div>
