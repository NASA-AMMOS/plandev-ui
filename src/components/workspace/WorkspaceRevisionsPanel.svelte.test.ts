import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activeDocument } from '../../stores/activeDocument';
import type { WorkspaceFileRevision } from '../../types/workspace';
import { showWorkspaceRevisionPreviewModal } from '../../utilities/modal';
import WorkspaceRevisionsPanel from './WorkspaceRevisionsPanel.svelte';

vi.mock('svelte', async importOriginal => {
  const actual = await importOriginal<typeof import('svelte')>();
  return {
    ...actual,
    getContext: vi.fn((key: string) => (key === 'user' ? writable(null) : actual.getContext(key))),
    untrack: vi.fn(fn => fn()), // used by SvelteKit's client, absent from Svelte 4
  };
});
vi.mock('$env/dynamic/public', () => import.meta.env); // https://github.com/sveltejs/kit/issues/8180
vi.mock('../../utilities/modal', () => ({ showWorkspaceRevisionPreviewModal: vi.fn().mockResolvedValue({}) }));

const revision = (name: string): WorkspaceFileRevision => ({
  createdAt: '2026-10-07T10:42:00Z',
  createdBy: 'alice',
  lastEditedAt: null,
  lastEditedBy: null,
  message: '',
  name,
  pathAtRevision: 'a.seq',
});
const [a, b, c] = [revision('a'), revision('b'), revision('c')];
const revisionList = [c, b, a];

// Mirrors how +page.svelte derives doesWorkingCopyMatchLatestRevision from the loaded revision list.
function renderPanel(matchingRevisionName: string | null) {
  return render(WorkspaceRevisionsPanel, {
    props: {
      doesWorkingCopyMatchLatestRevision: matchingRevisionName != null && matchingRevisionName === revisionList[0]?.name,
      filePath: 'a.seq',
      hasEditPermission: true,
      matchingRevisionName,
      reloadWorkingCopy: vi.fn(),
      revisionList,
    },
  });
}

describe('WorkspaceRevisionsPanel', () => {
  beforeEach(() => {
    activeDocument.startLoad('a.seq', 'a.seq', null);
    activeDocument.open('a.seq', 'saved', '"etag"');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('says which revision the saved copy matches, until unsaved editor changes make that stale', async () => {
    const { getByLabelText } = renderPanel(b.name);
    const section = getByLabelText('Working copy');
    expect(section.textContent).toContain('The saved copy matches revision b');

    activeDocument.updateContent('typed');
    await waitFor(() => expect(section.textContent).toContain('Unsaved editor changes'));
    expect(section.textContent).toContain('Save your changes before creating a revision.');
  });

  it('disables Create only when the saved copy matches the latest revision', () => {
    const latest = renderPanel(c.name);
    expect(latest.getByText('The saved copy matches the latest revision.')).toBeTruthy();
    expect((latest.getByRole('button', { name: 'Create revision' }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    const older = renderPanel(b.name);
    expect(older.getByLabelText('Working copy').textContent).toContain('matches revision b');
    expect((older.getByRole('button', { name: 'Create revision' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('warns about losing the saved copy only when it does not match the latest revision', async () => {
    for (const [matchingRevisionName, warns] of [
      [c.name, false],
      [b.name, true],
      [null, true],
    ] as const) {
      const { getByTitle } = renderPanel(matchingRevisionName);
      await fireEvent.click(getByTitle('Preview revision a'));
      const props = vi.mocked(showWorkspaceRevisionPreviewModal).mock.lastCall?.[0];
      expect(!!props?.unrevisionedWarning).toBe(warns);
      cleanup();
    }
  });
});
