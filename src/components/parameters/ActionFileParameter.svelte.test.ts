import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FormParameter } from '../../types/parameter';
import type { WorkspaceFileRevision } from '../../types/workspace';
import { WorkspaceApi } from '../../utilities/workspaces';
import ActionFileParameter from './ActionFileParameter.svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} })); // https://github.com/sveltejs/kit/issues/8180
vi.mock('../../utilities/workspaces', () => ({ WorkspaceApi: { getFileRevisionList: vi.fn() } }));

const options = ['approach.seq', 'descent.seq', 'parameters.json'].map(path => ({
  display: path,
  type: 'SEQUENCE',
  value: path,
}));

function formParameter(value: unknown, multiple = true, allowWorkingCopy?: boolean): FormParameter {
  return {
    errors: null,
    name: 'inputs',
    order: 0,
    schema: {
      allowWorkingCopy,
      label: 'file',
      options,
      type: multiple ? 'options-multiple' : 'options-single',
      withRevision: true,
    } as FormParameter['schema'],
    value,
    valueSource: 'none',
  };
}

const revisionB: WorkspaceFileRevision = {
  createdAt: '2026-10-20T10:00:00Z',
  createdBy: 'alice',
  lastEditedAt: null,
  lastEditedBy: null,
  message: 'flight ready',
  name: 'b',
  pathAtRevision: 'old/descent.seq',
};

const listRevisions = vi.mocked(WorkspaceApi.getFileRevisionList);

function renderWith(props: { disabled?: boolean; formParameter: FormParameter }, revisions = [revisionB]) {
  listRevisions.mockReset().mockResolvedValue({ matchingRevision: null, revisions });
  const result = render(ActionFileParameter, { context: new Map([['user', writable(null)]]), props });
  const changes: unknown[] = [];
  result.component.$on('change', (e: CustomEvent<FormParameter>) => changes.push(e.detail.value));
  return { ...result, changes };
}

function revisionPicker(result: ReturnType<typeof renderWith>, path: string) {
  return within(result.getByRole('group', { name: `Revision of ${path}` })).getByRole('combobox');
}

describe('ActionFileParameter', () => {
  afterEach(() => cleanup());

  it('lists each selected file with its own revision', () => {
    const result = renderWith({
      formParameter: formParameter([
        { path: 'approach.seq', revision: null },
        { path: 'descent.seq', revision: 'b' },
        { path: 'parameters.json', revision: null },
      ]),
    });

    expect(revisionPicker(result, 'approach.seq').textContent).toContain('Working copy');
    expect(revisionPicker(result, 'descent.seq').textContent).toContain('Revision B');
    expect(revisionPicker(result, 'parameters.json').textContent).toContain('Working copy');
  });

  it('fetches revisions lazily on open and pins the chosen one', async () => {
    const result = renderWith({ formParameter: formParameter({ path: 'descent.seq', revision: null }, false) });
    expect(listRevisions).not.toHaveBeenCalled();

    await fireEvent.click(revisionPicker(result, 'descent.seq'));
    expect(listRevisions).toHaveBeenCalledWith(expect.anything(), 'descent.seq', null);
    await fireEvent.click(revisionPicker(result, 'descent.seq'));
    expect(listRevisions).toHaveBeenCalledTimes(1); // reopening does not refetch
  });

  it('loads the description of an already pinned revision without opening the menu', async () => {
    const result = renderWith({ formParameter: formParameter({ path: 'descent.seq', revision: 'b' }, false) });
    await waitFor(() => expect(listRevisions).toHaveBeenCalledTimes(1));
    expect(revisionPicker(result, 'descent.seq').textContent).toContain('Revision B');
  });

  it('says so when a file has no revisions, and offers a retry on failure', async () => {
    const empty = renderWith({ formParameter: formParameter({ path: 'a.seq', revision: null }, false) }, []);
    await fireEvent.click(revisionPicker(empty, 'a.seq'));
    expect(await empty.findByText('This file has no revisions yet')).toBeTruthy();
    cleanup();

    const failing = renderWith({ formParameter: formParameter({ path: 'a.seq', revision: null }, false) });
    listRevisions.mockRejectedValueOnce(new Error('boom'));
    await fireEvent.click(revisionPicker(failing, 'a.seq'));
    await fireEvent.click(await failing.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(failing.queryByRole('button', { name: 'Retry' })).toBeNull());
    expect(listRevisions).toHaveBeenCalledTimes(2);
  });

  describe('when the working copy is not allowed', () => {
    it('asks for a revision instead of defaulting to the working copy', async () => {
      const result = renderWith({
        formParameter: formParameter({ path: 'descent.seq', revision: null }, false, false),
      });
      expect(revisionPicker(result, 'descent.seq').textContent).toContain('Select revision');

      await fireEvent.click(revisionPicker(result, 'descent.seq'));
      await waitFor(() => expect(listRevisions).toHaveBeenCalled());
      expect(result.queryByRole('menuitem', { name: /Working copy/ })).toBeNull();
    });

    it('explains when the file has no revisions to choose from', async () => {
      const result = renderWith({ formParameter: formParameter({ path: 'a.seq', revision: null }, false, false) }, []);
      await fireEvent.click(revisionPicker(result, 'a.seq'));
      expect(await result.findByText(/has no revisions yet, so it can’t be used/)).toBeTruthy();
    });
  });

  it('shows each file and revision as text for run details', () => {
    const { getByRole, queryByRole } = renderWith({
      disabled: true,
      formParameter: formParameter([
        { path: 'sequences/descent.seq', revision: 'b' },
        { path: 'config/parameters.json', revision: null },
      ]),
    });
    expect((getByRole('textbox', { name: 'inputs' }) as HTMLInputElement).value).toBe(
      'sequences/descent.seq · Revision B, config/parameters.json · Working copy',
    );
    expect(queryByRole('combobox')).toBeNull();
  });
});
