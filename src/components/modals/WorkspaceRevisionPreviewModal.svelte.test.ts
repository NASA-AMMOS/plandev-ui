import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceContentType } from '../../enums/workspace';
import type { WorkspaceFileRevision } from '../../types/workspace';
import { WorkspaceApi } from '../../utilities/workspaces';
import WorkspaceRevisionPreviewModal from './WorkspaceRevisionPreviewModal.svelte';

vi.mock('$env/dynamic/public', () => import.meta.env); // https://github.com/sveltejs/kit/issues/8180

const a: WorkspaceFileRevision = {
  createdAt: '2026-10-07T10:42:00Z',
  createdBy: 'alice',
  lastEditedAt: null,
  lastEditedBy: null,
  message: '',
  name: 'a',
  pathAtRevision: 'a.seq',
};

describe('WorkspaceRevisionPreviewModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('describes the differences only after both content and metadata are loaded', async () => {
    vi.spyOn(WorkspaceApi, 'getFileRevisionContent').mockResolvedValue({
      content: 'same',
      renderType: WorkspaceContentType.Text,
    });
    let finishMetadata = () => {};
    vi.spyOn(WorkspaceApi, 'getFileRevision').mockReturnValue(
      new Promise(
        resolve =>
          (finishMetadata = () =>
            resolve({ fileMetadata: { metadata: { user: { status: 'draft' } } }, versionMetadata: { ...a } })),
      ),
    );
    vi.spyOn(WorkspaceApi, 'getFileMetadata').mockResolvedValue({ readOnly: true, user: {} } as never);
    const { container } = render(WorkspaceRevisionPreviewModal, {
      props: {
        currentContent: 'same',
        filePath: 'a.seq',
        revision: a,
        workspaceId: 1,
      },
    });

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(container.textContent).toContain('Loading…');
    expect(container.textContent).not.toContain('File metadata differs');

    finishMetadata();
    await waitFor(() => expect(container.textContent).toContain('File metadata differs'));
    expect(container.textContent).toContain('No content changes');
  });

  it('is read-only: offers no restore and dispatches close from the Close button', async () => {
    vi.spyOn(WorkspaceApi, 'getFileRevisionContent').mockResolvedValue({
      content: 'old',
      renderType: WorkspaceContentType.Text,
    });
    vi.spyOn(WorkspaceApi, 'getFileRevision').mockResolvedValue({ fileMetadata: {}, versionMetadata: { ...a } });
    vi.spyOn(WorkspaceApi, 'getFileMetadata').mockResolvedValue(null);
    const restoreFileRevision = vi.spyOn(WorkspaceApi, 'restoreFileRevision');
    const onClose = vi.fn();
    const { component, container, getByRole, queryByRole } = render(WorkspaceRevisionPreviewModal, {
      props: {
        currentContent: 'new',
        filePath: 'a.seq',
        revision: a,
        workspaceId: 1,
      },
    });
    component.$on('close', onClose);

    await waitFor(() => expect(container.textContent).not.toContain('Loading…'));
    expect(queryByRole('button', { name: /^Restore/ })).toBeNull();

    await fireEvent.click(getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(restoreFileRevision).not.toHaveBeenCalled();
  });
});
