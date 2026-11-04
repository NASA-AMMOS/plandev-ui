import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activeDocument } from '../../stores/activeDocument';
import type { ActionDefinition } from '../../types/actions';
import type { WorkspaceFileRevision, WorkspaceRevisionName } from '../../types/workspace';
import effects from '../../utilities/effects';
import WorkspaceRevisionsPanel from './WorkspaceRevisionsPanel.svelte';

vi.mock('$env/dynamic/public', () => ({
  get env() {
    return process.env;
  },
}));
vi.mock('../../utilities/modal', () => ({ showWorkspaceRevisionPreviewModal: vi.fn().mockResolvedValue({}) }));
vi.mock('../../utilities/effects', () => ({
  default: { restoreWorkspaceFileRevision: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../utilities/permissions', () => ({
  featurePermissions: {
    workspace: {
      canCreate: vi.fn().mockReturnValue(true),
      canUpdate: vi.fn().mockReturnValue(true),
    },
  },
}));

const revision = (name: string): WorkspaceFileRevision => ({
  createdAt: '2026-10-07T10:42:00Z',
  createdBy: 'alice',
  lastEditedAt: null,
  lastEditedBy: null,
  message: '',
  name,
  pathAtRevision: 'a.seq',
});

const configurations = [
  {
    convention: 'numeric',
    display: { a: '1', b: '2', c: '3' },
    envValue: undefined,
    revs: { a: '1', b: '2', c: '3' },
    validation: {
      error: 'Only numbers are allowed. No letters, spaces, or symbols.',
      invalidVal: 'b',
      startVal: '1',
    },
  },
  {
    convention: 'alphabetic',
    display: { a: 'A', b: 'B', c: 'C' },
    envValue: 'ALPHABETIC',
    revs: { a: 'a', b: 'b', c: 'c' },
    validation: {
      error: 'Only letters are allowed. No numbers, spaces, or symbols.',
      invalidVal: '1',
      startVal: 'A',
    },
  },
];

describe.each(configurations)('WorkspaceRevisionsPanel - $convention naming convention', config => {
  const [a, b, c] = [revision(config.revs.a), revision(config.revs.b), revision(config.revs.c)];
  const revisionList = [c, b, a];

  function renderPanel(matchingRevisionName: WorkspaceRevisionName | null) {
    return render(WorkspaceRevisionsPanel, {
      props: {
        doesWorkingCopyMatchLatestRevision:
          matchingRevisionName != null && matchingRevisionName === revisionList[0]?.name,
        filePath: 'a.seq',
        hasCreateRevisionPermission: true,
        hasRestoreRevisionPermission: true,
        matchingRevisionName,
        reloadWorkingCopy: vi.fn(),
        revisionList,
      },
    });
  }

  beforeEach(() => {
    if (config.envValue) {
      vi.stubEnv('PUBLIC_WORKSPACE_REVISION_NAMING_CONVENTION', config.envValue);
    }
    activeDocument.startLoad('a.seq', 'a.seq', null);
    activeDocument.open('a.seq', 'saved', '"etag"');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it(`validates the starting revision as ${config.convention}`, async () => {
    const { getByRole, queryByRole } = render(WorkspaceRevisionsPanel, {
      props: { filePath: 'a.seq', hasCreateRevisionPermission: true, reloadWorkingCopy: vi.fn(), revisionList: [] },
    });
    const input: HTMLInputElement = getByRole('textbox', { name: 'Starting revision name' }) as HTMLInputElement;
    expect(input.value).toBe(config.validation.startVal);
    expect(queryByRole('alert')).toBeNull();

    await fireEvent.input(input, { target: { value: config.validation.invalidVal } });
    expect(getByRole('alert').textContent).toBe(config.validation.error);
    expect((getByRole('button', { name: 'Create revision' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('says which revision the saved copy matches, until unsaved editor changes make that stale', async () => {
    const { getByLabelText } = renderPanel(b.name);
    const section = getByLabelText('Create revision');
    expect(section.textContent).toContain(`The saved copy matches revision ${config.display.b}`);

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
    expect(older.getByLabelText('Create revision').textContent).toContain(`matches revision ${config.display.b}`);
    expect((older.getByRole('button', { name: 'Create revision' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it.each([
    ['latest', c.name, false],
    ['older', b.name, true],
    ['none', null, true],
  ])('warns about losing the saved copy when matchingRevisionName is %s', async (_, matchingRevisionName, warns) => {
    const { getByRole, getAllByRole } = renderPanel(matchingRevisionName);
    const revisionButton = await getByRole('region', { name: `Revision ${config.display.a}` });
    await fireEvent.click(within(revisionButton).getByRole('button', { name: 'More options' }));

    const restoreMenuItem = (
      await getAllByRole('menuitem', { name: `Restore file to revision ${config.display.a}` })
    ).at(0);
    await fireEvent.click(restoreMenuItem!);

    const options = vi.mocked(effects.restoreWorkspaceFileRevision).mock.lastCall?.[4];
    expect(!!options?.unrevisionedWarning).toBe(warns);
    cleanup();
  });

  it('runs a revision-aware action on the chosen revision, offering only actions that take revisions', async () => {
    const makeAction = (name: string, withRevision: boolean) =>
      ({
        description: '',
        name,
        versions: [{ parameter_schema: { file: { type: 'file', ...(withRevision ? { withRevision: true } : {}) } } }],
      }) as unknown as ActionDefinition;
    const aware = makeAction('Aware', true);
    const unaware = makeAction('Unaware', false);
    const { component, getByRole, findByRole, queryByRole } = render(WorkspaceRevisionsPanel, {
      props: {
        availableActions: [
          { action: unaware, parameter: 'file' },
          { action: aware, parameter: 'file' },
        ],
        filePath: 'a.seq',
        hasRunActionPermission: true,
        reloadWorkingCopy: vi.fn(),
        revisionList,
      },
    });
    const onRunAction = vi.fn();
    component.$on('runAction', e => onRunAction(e.detail));

    const region = getByRole('region', { name: `Revision ${config.display.b}` });
    await fireEvent.click(within(region).getByRole('button', { name: 'More options' }));
    await fireEvent.keyDown(await findByRole('menuitem', { name: `Run action on revision ${config.display.b}` }), {
      key: 'ArrowRight',
    });
    await fireEvent.click(await findByRole('menuitem', { name: /Aware/ }));

    expect(queryByRole('menuitem', { name: /Unaware/ })).toBeNull();
    expect(onRunAction).toHaveBeenCalledWith({ action: aware, parameter: 'file', revision: b });
  });
});
