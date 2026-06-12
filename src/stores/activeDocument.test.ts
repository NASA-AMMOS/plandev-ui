import { get } from 'svelte/store';
import { afterEach, describe, expect, test } from 'vitest';
import { WorkspaceContentType } from '../enums/workspace';
import { activeDocument, activeDocumentIsDirty } from './activeDocument';

describe('activeDocument store — baseToken (simultaneous-edit protection)', () => {
  afterEach(() => {
    activeDocument.reset();
  });

  test('open stores the server etag as baseToken when the path matches loadingPath', () => {
    activeDocument.startLoad('foo/bar.seq', 'bar.seq', WorkspaceContentType.Sequence);
    expect(get(activeDocument).baseToken).toBeNull();

    const opened = activeDocument.open('foo/bar.seq', 'hello', '"tok-1"');

    expect(opened).toBe(true);
    const state = get(activeDocument);
    expect(state.baseToken).toBe('"tok-1"');
    expect(state.currentContent).toBe('hello');
    expect(state.originalContent).toBe('hello');
    expect(get(activeDocumentIsDirty)).toBe(false);
  });

  test('open ignores a stale path and leaves baseToken untouched', () => {
    activeDocument.startLoad('foo/bar.seq', 'bar.seq', WorkspaceContentType.Sequence);

    const opened = activeDocument.open('other/file.seq', 'nope', '"tok-x"');

    expect(opened).toBe(false);
    expect(get(activeDocument).baseToken).toBeNull();
  });

  test('startLoad clears a previously stored baseToken', () => {
    activeDocument.startLoad('a.seq', 'a.seq', WorkspaceContentType.Sequence);
    activeDocument.open('a.seq', 'x', '"tok-a"');
    expect(get(activeDocument).baseToken).toBe('"tok-a"');

    activeDocument.startLoad('b.seq', 'b.seq', WorkspaceContentType.Sequence);

    expect(get(activeDocument).baseToken).toBeNull();
  });

  test('markClean advances baseToken when a new token is given, and preserves it otherwise', () => {
    activeDocument.startLoad('a.seq', 'a.seq', WorkspaceContentType.Sequence);
    activeDocument.open('a.seq', 'x', '"tok-a"');
    activeDocument.updateContent('x edited');
    expect(get(activeDocumentIsDirty)).toBe(true);

    activeDocument.markClean('x edited', '"tok-b"');

    let state = get(activeDocument);
    expect(state.baseToken).toBe('"tok-b"');
    expect(state.originalContent).toBe('x edited');
    expect(get(activeDocumentIsDirty)).toBe(false);

    // No token argument -> baseToken is left unchanged.
    activeDocument.updateContent('x edited 2');
    activeDocument.markClean('x edited 2');
    state = get(activeDocument);
    expect(state.baseToken).toBe('"tok-b"');
  });

  test('replaceWithServer rebases content + token when the path still matches', () => {
    activeDocument.startLoad('a.seq', 'a.seq', WorkspaceContentType.Sequence);
    activeDocument.open('a.seq', 'mine', '"tok-a"');
    activeDocument.updateContent('mine edited');

    const applied = activeDocument.replaceWithServer('a.seq', 'theirs', '"tok-server"');

    expect(applied).toBe(true);
    const state = get(activeDocument);
    expect(state.currentContent).toBe('theirs');
    expect(state.originalContent).toBe('theirs');
    expect(state.baseToken).toBe('"tok-server"');
    expect(get(activeDocumentIsDirty)).toBe(false);
  });

  test('replaceWithServer ignores a path that is no longer the active document', () => {
    activeDocument.startLoad('a.seq', 'a.seq', WorkspaceContentType.Sequence);
    activeDocument.open('a.seq', 'mine', '"tok-a"');

    const applied = activeDocument.replaceWithServer('different.seq', 'theirs', '"tok-server"');

    expect(applied).toBe(false);
    const state = get(activeDocument);
    expect(state.currentContent).toBe('mine');
    expect(state.baseToken).toBe('"tok-a"');
  });
});
