// Copy handler for containers that hold multiple ConsoleLog rows.
// Each row's summary is rendered with a flex layout that browsers serialize
// as multiple lines on copy (one per flex item). For multi-row selections
// we walk the selected <details> rows and emit one cleaned line per summary,
// preserving newlines inside <pre> blocks in any expanded content.
//
// This is structurally coupled to ConsoleLog.svelte's template (<details> /
// <summary> / expanded <pre> blocks). If that DOM shape changes, update this
// file too — the per-summary handler in ConsoleLog.svelte has the same caveat.
export function handleConsoleLogCopy(e: ClipboardEvent, container: HTMLElement | undefined): void {
  if (!container) {
    return;
  }
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return;
  }
  const detailsEls = Array.from(container.querySelectorAll('details')).filter(d => selection.containsNode(d, true));
  if (detailsEls.length === 0) {
    return;
  }
  // The per-summary handler in ConsoleLog runs first for selections inside a single summary.
  // If it already wrote to the clipboard, don't override.
  if (e.defaultPrevented) {
    return;
  }
  // Single-row case: bail only when the selection is entirely *outside* the summary
  // (e.g. inside an expanded <pre>) — native copy preserves newlines there.
  // A selection that spans summary→expanded falls through and gets row-processed below
  // so the summary half is cleaned while the <pre> content keeps its newlines.
  if (detailsEls.length === 1) {
    const summary = detailsEls[0].querySelector('summary');
    const range = selection.getRangeAt(0);
    if (summary && !summary.contains(range.startContainer) && !summary.contains(range.endContainer)) {
      return;
    }
  }

  const lines: string[] = [];
  for (const row of detailsEls) {
    const summary = row.querySelector('summary');
    if (summary) {
      const t = (summary.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (t) {
        lines.push(t);
      }
    }
    if (row.open) {
      const expanded = Array.from(row.children).find(c => c.tagName !== 'SUMMARY');
      if (expanded) {
        for (const child of expanded.children) {
          if (child.tagName === 'PRE') {
            lines.push(child.textContent ?? '');
          } else {
            const t = (child.textContent ?? '').replace(/\s+/g, ' ').trim();
            if (t) {
              lines.push(t);
            }
          }
        }
      }
    }
  }
  e.clipboardData?.setData('text/plain', lines.join('\n'));
  e.preventDefault();
}

// Svelte action for containers that hold one or more ConsoleLog rows.
// Usage: <div use:consoleLogCopy class="...">{#each logs as log}<ConsoleLog .../>{/each}</div>
export function consoleLogCopy(node: HTMLElement) {
  const handler = (e: Event) => handleConsoleLogCopy(e as ClipboardEvent, node);
  node.addEventListener('copy', handler);
  return {
    destroy: () => node.removeEventListener('copy', handler),
  };
}
