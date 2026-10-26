import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceContentType } from '../../enums/workspace';
import type { WorkspaceFileRevision } from '../../types/workspace';
import { WorkspaceApi } from '../../utilities/workspaces';
import WorkspaceRevisionRestoreModal from './WorkspaceRevisionRestoreModal.svelte';

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
    const { container, getByRole } = render(WorkspaceRevisionRestoreModal, {
      props: {
        currentContent: 'same',
        filePath: 'a.seq',
        revision: a,
        workspaceId: 1,
      },
    });

    await new Promise(resolve => setTimeout(resolve, 20));
    expect((getByRole('button', { name: 'Restore' }) as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).not.toContain('File metadata differs');

    finishMetadata();
    await waitFor(() => expect(container.textContent).toContain('File metadata differs'));
    expect(container.textContent).toContain('No content changes');
    expect((getByRole('button', { name: 'Restore' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('dispatches restore with the selected revision without performing the request itself', async () => {
    vi.spyOn(WorkspaceApi, 'getFileRevisionContent').mockResolvedValue({
      content: 'old',
      renderType: WorkspaceContentType.Text,
    });
    vi.spyOn(WorkspaceApi, 'getFileRevision').mockResolvedValue({ fileMetadata: {}, versionMetadata: { ...a } });
    vi.spyOn(WorkspaceApi, 'getFileMetadata').mockResolvedValue(null);
    const restoreFileRevision = vi.spyOn(WorkspaceApi, 'restoreFileRevision');
    const onClose = vi.fn();
    const onRestore = vi.fn();
    const { component, getByRole } = render(WorkspaceRevisionRestoreModal, {
      props: {
        currentContent: 'new',
        filePath: 'a.seq',
        revision: a,
        workspaceId: 1,
      },
    });
    component.$on('close', onClose);
    component.$on('restore', onRestore);

    await waitFor(() => expect((getByRole('button', { name: 'Restore' }) as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(getByRole('button', { name: 'Restore' }));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore.mock.calls[0][0].detail).toEqual({ revision: a });
    expect(restoreFileRevision).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not dispatch restore when restoring is disabled', async () => {
    vi.spyOn(WorkspaceApi, 'getFileRevisionContent').mockResolvedValue({
      content: 'old',
      renderType: WorkspaceContentType.Text,
    });
    vi.spyOn(WorkspaceApi, 'getFileRevision').mockResolvedValue({ fileMetadata: {}, versionMetadata: { ...a } });
    vi.spyOn(WorkspaceApi, 'getFileMetadata').mockResolvedValue(null);
    const onRestore = vi.fn();
    const { component, getByRole } = render(WorkspaceRevisionRestoreModal, {
      props: {
        currentContent: 'new',
        filePath: 'a.seq',
        restoreDisabledReason: 'No permission',
        revision: a,
        workspaceId: 1,
      },
    });
    component.$on('restore', onRestore);

    await waitFor(() => expect(getByRole('button', { name: 'Restore' })).toBeTruthy());
    expect((getByRole('button', { name: 'Restore' }) as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(getByRole('button', { name: 'Restore' }));
    expect(onRestore).not.toHaveBeenCalled();
  });
});
