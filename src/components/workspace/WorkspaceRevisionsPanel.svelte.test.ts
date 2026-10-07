import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activeDocument } from '../../stores/activeDocument';
import type { WorkspaceFileRevision, WorkspaceFileRevisionList } from '../../types/workspace';
import { showWorkspaceRevisionPreviewModal } from '../../utilities/modal';
import { WorkspaceApi } from '../../utilities/workspaces';
import WorkspaceRevisionPreviewModal from '../modals/WorkspaceRevisionPreviewModal.svelte';
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

const revision = (name: string, ordinal: number): WorkspaceFileRevision => ({
  createdAt: '2026-10-07T10:42:00Z',
  createdBy: 'alice',
  id: `r-${name}`,
  name,
  ordinal,
  pathAtRevision: 'a.seq',
});
const [a, b, c] = [revision('a', 1), revision('b', 2), revision('c', 3)];

function list(matchingRevision: WorkspaceFileRevision | null): WorkspaceFileRevisionList {
  return { fileId: 'f-1', latestRevision: c, matchingRevision, revisions: [a, b, c], workingCopyETag: '"wc"' };
}

function renderPanel(revisions: WorkspaceFileRevisionList) {
  vi.spyOn(WorkspaceApi, 'listFileRevisions').mockResolvedValue(revisions);
  return render(WorkspaceRevisionsPanel, {
    props: { filePath: 'a.seq', hasEditPermission: true, reloadWorkingCopy: vi.fn() },
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

  it('says which revision the saved copy matches, alongside unsaved editor changes', async () => {
    const { getByLabelText } = renderPanel(list(b));
    const section = getByLabelText('Working copy');
    await waitFor(() => expect(section.textContent).toContain('Saved copy matches revision b'));

    activeDocument.updateContent('typed');
    await waitFor(() => expect(section.textContent).toContain('Unsaved editor changes'));
    expect(section.textContent).toContain('Saved copy matches revision b');
  });

  it('disables Create only when the saved copy matches the latest revision', async () => {
    const latest = renderPanel(list(c));
    await waitFor(() => expect(latest.getByText('The saved copy already matches the latest revision.')).toBeTruthy());
    expect((latest.getByRole('button', { name: 'Create revision' }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    const older = renderPanel(list(b));
    await waitFor(() => expect(older.getByLabelText('Working copy').textContent).toContain('matches revision b'));
    expect((older.getByRole('button', { name: 'Create revision' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('warns about losing the saved copy only when no revision holds it', async () => {
    for (const [matching, warns] of [
      [b, false],
      [null, true],
    ] as const) {
      const { getByTitle, getByLabelText } = renderPanel(list(matching));
      await waitFor(() => expect(getByLabelText('Working copy').textContent).toContain(matching ? 'matches' : 'since'));
      await fireEvent.click(getByTitle('Preview revision a'));
      const props = vi.mocked(showWorkspaceRevisionPreviewModal).mock.lastCall?.[0];
      expect(!!props?.unrevisionedWarning).toBe(warns);
      cleanup();
    }
  });
});

describe('WorkspaceRevisionPreviewModal', () => {
  afterEach(() => cleanup());

  it('stays open and blocks a second restore while one is in flight', async () => {
    vi.spyOn(WorkspaceApi, 'getFileRevisionContent').mockResolvedValue('old');
    vi.spyOn(WorkspaceApi, 'getFileRevision').mockResolvedValue({ ...a, metadata: {} });
    vi.spyOn(WorkspaceApi, 'getFileMetadata').mockResolvedValue(null);
    let finish = () => {};
    const restore = vi.fn(() => new Promise<void>(resolve => (finish = resolve)));
    const onClose = vi.fn();
    const { component, getByRole } = render(WorkspaceRevisionPreviewModal, {
      props: {
        currentContent: 'new',
        currentLabel: 'Working copy',
        filePath: 'a.seq',
        restore,
        revision: a,
        workspaceId: 1,
      },
    });
    component.$on('close', onClose);

    await waitFor(() => expect((getByRole('button', { name: 'Restore…' }) as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(getByRole('button', { name: 'Restore…' }));
    await fireEvent.click(getByRole('button', { name: 'Restore' }));
    const restoring = getByRole('button', { name: 'Restoring…' });
    expect((restoring as HTMLButtonElement).disabled).toBe(true);
    expect((getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(restoring);
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(restore).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    finish();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
