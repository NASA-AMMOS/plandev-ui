import { get } from 'svelte/store';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createFileRevisionHistory } from './fileRevisionHistory';
import { WorkspaceApi } from './workspaces';

vi.mock('./workspaces', () => ({ WorkspaceApi: { getFileRevisionList: vi.fn() } }));
vi.mock('../stores/workspaces', async () => ({ workspaceId: (await import('svelte/store')).writable(1) }));

const getList = vi.mocked(WorkspaceApi.getFileRevisionList);
const revision = { createdAt: '', createdBy: 'test', message: '', name: 'a' };

describe('createFileRevisionHistory', () => {
  beforeEach(() => {
    getList.mockReset();
  });

  test('fetches each file once, and again only on refresh or after a failure', async () => {
    getList.mockResolvedValue({ matchingRevision: '', revisions: [revision] } as never);
    const history = createFileRevisionHistory();
    await Promise.all([history.load('a.seq', null), history.load('a.seq', null)]);
    await history.load('a.seq', null);
    expect(getList).toHaveBeenCalledTimes(1);
    expect(get(history)).toEqual({ 'a.seq': [revision] });

    await history.load('a.seq', null, true);
    expect(getList).toHaveBeenCalledTimes(2);

    getList.mockRejectedValueOnce(new Error('down'));
    await history.load('b.seq', null);
    expect(get(history)['b.seq']).toBe('error');
    await history.load('b.seq', null);
    expect(get(history)['b.seq']).toEqual([revision]);
  });
});
