import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activeDocument } from '../../stores/activeDocument';
import type { WorkspaceFileRevision, WorkspaceRevisionName } from '../../types/workspace';
import effects from '../../utilities/effects';
import WorkspaceRevisionsPanel from './WorkspaceRevisionsPanel.svelte';

vi.mock('svelte', async importOriginal => {
  const actual = await importOriginal<typeof import('svelte')>();
  return {
    ...actual,
    getContext: vi.fn((key: string) => (key === 'user' ? writable(null) : actual.getContext(key))),
    untrack: vi.fn(fn => fn()), // used by SvelteKit's client, absent from Svelte 4
  };
});
vi.mock('$env/dynamic/public', () => ({ env: {} })); // https://github.com/sveltejs/kit/issues/8180

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
const [a, b, c] = [revision('a'), revision('b'), revision('c')];
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

describe('WorkspaceRevisionsPanel', () => {
  beforeEach(() => {
    activeDocument.startLoad('a.seq', 'a.seq', null);
    activeDocument.open('a.seq', 'saved', '"etag"');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    [c.name, false],
    [b.name, true],
    [null, true],
  ])('warns about losing the saved copy when matchingRevisionName is %s', async (matchingRevisionName, warns) => {
    const { getByRole, getAllByRole } = renderPanel(matchingRevisionName);
    const revisionButton = await getByRole('region', { name: 'Revision A' });
    await fireEvent.click(within(revisionButton).getByRole('button', { name: 'More options' }));
    const restoreMenuItem = (await getAllByRole('menuitem', { name: 'Restore file to revision A' })).at(0);
    await fireEvent.click(restoreMenuItem!);
    screen.debug(restoreMenuItem);

    const options = vi.mocked(effects.restoreWorkspaceFileRevision).mock.lastCall?.[4];
    expect(!!options?.unrevisionedWarning).toBe(warns);
    cleanup();
  });
});
