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
  afterEach(() => cleanup());

  it('describes and enables Restore only after both content and metadata are checked', async () => {
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
    const { container, getByRole } = render(WorkspaceRevisionPreviewModal, {
      props: {
        currentContent: 'same',
        filePath: 'a.seq',
        revision: a,
        workspaceId: 1,
      },
    });

    await new Promise(resolve => setTimeout(resolve, 20));
    expect((getByRole('button', { name: 'Restore…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).not.toContain('File metadata differs');

    finishMetadata();
    await waitFor(() => expect(container.textContent).toContain('File metadata differs'));
    expect(container.textContent).toContain('No content differences');
    expect((getByRole('button', { name: 'Restore…' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('stays open and blocks a second restore while one is in flight', async () => {
    vi.spyOn(WorkspaceApi, 'getFileRevisionContent').mockResolvedValue({
      content: 'old',
      renderType: WorkspaceContentType.Text,
    });
    vi.spyOn(WorkspaceApi, 'getFileRevision').mockResolvedValue({ fileMetadata: {}, versionMetadata: { ...a } });
    vi.spyOn(WorkspaceApi, 'getFileMetadata').mockResolvedValue(null);
    let finish = () => {};
    const restore = vi.fn(() => new Promise<void>(resolve => (finish = resolve)));
    const onClose = vi.fn();
    const { component, getByRole } = render(WorkspaceRevisionPreviewModal, {
      props: {
        currentContent: 'new',
        filePath: 'a.seq',
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
