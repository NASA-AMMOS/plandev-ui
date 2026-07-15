import { forEachDiagnostic } from '@codemirror/lint';
import type { EditorView } from 'codemirror';
import type { LintDiagnostic } from '../../types/console';

export function getLintDiagnostics(view: EditorView): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  forEachDiagnostic(view.state, (d, from, to) => {
    const fromLine = view.state.doc.lineAt(from);
    const toLine = view.state.doc.lineAt(to);
    diagnostics.push({
      from: { column: from - fromLine.from, line: fromLine.number },
      message: d.message,
      severity: d.severity,
      to: { column: to - toLine.from, line: toLine.number },
    });
  });
  return diagnostics;
}
