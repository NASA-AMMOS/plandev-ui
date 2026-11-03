import { Chunk } from '@codemirror/merge';
import { Text } from '@codemirror/state';

export type UnifiedDiffSide = {
  /** Document content. */
  doc: Text;
  /** Human-readable description, written after a tab on the `---`/`+++` line (ignored by patch tools). */
  label?: string | null;
  /** File name written on the `---`/`+++` line, e.g. `a/sequences/foo.json`. */
  name: string;
};

type LineRange = { aEnd: number; aStart: number; bEnd: number; bStart: number };

const noNewlineMarker = '\\\\ No newline at end of file';

/** Lines as a patch sees them: a trailing newline terminates the last line rather than starting an empty one. */
function patchLines(doc: Text): { endsWithNewline: boolean; lines: string[] } {
  if (doc.length === 0) {
    return { endsWithNewline: true, lines: [] };
  }
  const lines = doc.toString().split('\n');
  const endsWithNewline = lines.length > 1 && lines[lines.length - 1] === '';
  return { endsWithNewline, lines: endsWithNewline ? lines.slice(0, -1) : lines };
}

/** Converts a line-aligned chunk into 0-based, end-exclusive line ranges, clamped to the patch line counts. */
function chunkToLineRange(chunk: Chunk, a: Text, b: Text, aCount: number, bCount: number): LineRange {
  const aStart = a.lineAt(chunk.fromA).number - 1;
  const bStart = b.lineAt(chunk.fromB).number - 1;
  return {
    aEnd: Math.min(aCount, chunk.toA > chunk.fromA ? a.lineAt(chunk.endA).number : aStart),
    aStart: Math.min(aCount, aStart),
    bEnd: Math.min(bCount, chunk.toB > chunk.fromB ? b.lineAt(chunk.endB).number : bStart),
    bStart: Math.min(bCount, bStart),
  };
}

function hunkRange(start: number, size: number): string {
  // An empty range points at the line before it (0 when at the top of the file), per the unified format.
  const line = size === 0 ? start : start + 1;
  return size === 1 ? `${line}` : `${line},${size}`;
}

function fileHeader(prefix: '---' | '+++', side: UnifiedDiffSide): string {
  return side.label ? `${prefix} ${side.name}\t${side.label}` : `${prefix} ${side.name}`;
}

/**
 * Builds a unified diff (`diff -u` / `git diff` format) turning `a` into `b`.
 * @param chunks - Line-aligned chunks, e.g. `MergeView.chunks`, so the output matches what the viewer shows.
 *   Computed from the documents when omitted.
 * @param context - Unchanged lines to show around each change.
 * @returns The diff text, or an empty string when the documents are identical.
 */
export function createUnifiedDiff(
  a: UnifiedDiffSide,
  b: UnifiedDiffSide,
  chunks: readonly Chunk[] = Chunk.build(a.doc, b.doc),
  context: number = 3,
): string {
  const aPatch = patchLines(a.doc);
  const bPatch = patchLines(b.doc);
  const ranges = chunks
    .map(chunk => chunkToLineRange(chunk, a.doc, b.doc, aPatch.lines.length, bPatch.lines.length))
    .filter(range => range.aEnd > range.aStart || range.bEnd > range.bStart);
  if (ranges.length === 0) {
    return '';
  }

  // Chunks whose surrounding context would touch or overlap share a hunk.
  const groups: LineRange[][] = [];
  for (const range of ranges) {
    const group = groups.at(-1);
    if (group && range.aStart - group[group.length - 1].aEnd <= context * 2) {
      group.push(range);
    } else {
      groups.push([range]);
    }
  }

  const output = [fileHeader('---', a), fileHeader('+++', b)];

  const isUnterminated = (patch: typeof aPatch, line: number | null) =>
    line !== null && !patch.endsWithNewline && line === patch.lines.length - 1;
  /** Emits a line from `a` and/or `b` (both for context), flagging a file's last line if it has no newline. */
  const pushLine = (prefix: ' ' | '-' | '+', aLine: number | null, bLine: number | null) => {
    output.push(`${prefix}${aLine !== null ? aPatch.lines[aLine] : bPatch.lines[bLine ?? 0]}`);
    if (isUnterminated(aPatch, aLine) || isUnterminated(bPatch, bLine)) {
      output.push(noNewlineMarker);
    }
  };

  for (const group of groups) {
    const first = group[0];
    const last = group.at(-1) ?? first;
    const leading = Math.min(context, first.aStart, first.bStart);
    const trailing = Math.min(context, aPatch.lines.length - last.aEnd, bPatch.lines.length - last.bEnd);
    const aFrom = first.aStart - leading;
    const bFrom = first.bStart - leading;
    const aSize = last.aEnd + trailing - aFrom;
    const bSize = last.bEnd + trailing - bFrom;
    output.push(`@@ -${hunkRange(aFrom, aSize)} +${hunkRange(bFrom, bSize)} @@`);

    let aLine = aFrom;
    let bLine = bFrom;
    for (const range of group) {
      // Unchanged lines up to this chunk; they're identical on both sides.
      for (; aLine < range.aStart; aLine++, bLine++) {
        pushLine(' ', aLine, bLine);
      }
      for (; aLine < range.aEnd; aLine++) {
        pushLine('-', aLine, null);
      }
      for (; bLine < range.bEnd; bLine++) {
        pushLine('+', null, bLine);
      }
    }
    for (let i = 0; i < trailing; i++, aLine++, bLine++) {
      pushLine(' ', aLine, bLine);
    }
  }

  return `${output.join('\n')}\n`;
}
