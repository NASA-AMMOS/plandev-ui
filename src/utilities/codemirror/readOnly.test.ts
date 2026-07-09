import { EditorState } from '@codemirror/state';
import { describe, expect, test } from 'vitest';
import { readOnlyChangeGuard } from './readOnly';

function stateWith(allowedUserEvents?: string[]): EditorState {
  return EditorState.create({ doc: 'hello', extensions: [readOnlyChangeGuard(allowedUserEvents)] });
}

describe('readOnlyChangeGuard', () => {
  test('blocks every document change when no user events are allowed', () => {
    const tr = stateWith().update({ changes: { from: 0, insert: 'world', to: 5 } });
    expect(tr.newDoc.toString()).toBe('hello');
  });

  test('blocks a document change whose user event is not in the allow-list', () => {
    // e.g. the command-panel form-builder dispatches `userEvent: 'formView'`.
    const tr = stateWith(['file.open']).update({
      changes: { from: 0, insert: 'world', to: 5 },
      userEvent: 'formView',
    });
    expect(tr.newDoc.toString()).toBe('hello');
  });

  test('allows a document change whose user event is in the allow-list', () => {
    // e.g. the editor's own content sync when switching files.
    const tr = stateWith(['file.open']).update({
      changes: { from: 0, insert: 'world', to: 5 },
      userEvent: 'file.open',
    });
    expect(tr.newDoc.toString()).toBe('world');
  });

  test('matches user-event prefixes (file.open.subtype is allowed by file.open)', () => {
    const tr = stateWith(['file.open']).update({
      changes: { from: 0, insert: 'world', to: 5 },
      userEvent: 'file.open.subtype',
    });
    expect(tr.newDoc.toString()).toBe('world');
  });

  test('does not interfere with non-document (selection-only) transactions', () => {
    const tr = stateWith().update({ selection: { anchor: 2 } });
    expect(tr.state.selection.main.anchor).toBe(2);
    expect(tr.newDoc.toString()).toBe('hello');
  });
});
