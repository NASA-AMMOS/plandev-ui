import { EditorState, type Extension, type Transaction } from '@codemirror/state';

/**
 * Blocks edits to a "read-only" editor. `EditorState.readOnly` only stops typing/paste —
 * lint quick-fixes, the command-panel form, and sanitizers edit via `view.dispatch` and
 * slip past it. This rejects document changes outright.
 *
 * `allowedUserEvents` whitelists edits the editor still needs (e.g. `'file.open'` content
 * sync on file switch); pass none to block everything. Non-document changes are allowed.
 * Put it in the read-only compartment so it drops when the editor becomes editable.
 */
export function readOnlyChangeGuard(allowedUserEvents: string[] = []): Extension {
  return EditorState.changeFilter.of((transaction: Transaction) => {
    if (!transaction.docChanged) {
      return true;
    }
    return allowedUserEvents.some(userEvent => transaction.isUserEvent(userEvent));
  });
}
