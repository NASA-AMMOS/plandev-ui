import { afterEach, describe, expect, test, vi } from 'vitest';
import { WorkspaceSaveConflictError } from './requests';
import { WorkspaceApi } from './workspaces';

vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_WORKSPACE_CLIENT_URL: 'http://ws' } }));

const revision = {
  createdAt: '2026-10-07T10:42:00Z',
  createdBy: 'alice',
  id: 'r-1',
  name: 'a',
  ordinal: 1,
  pathAtRevision: 'foo/bar.seq',
};

function stubFetch(status: number, body: unknown = revision) {
  const fetchMock = vi.fn().mockResolvedValue({
    headers: { get: () => null },
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('WorkspaceApi file revisions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('listFileRevisions GETs /revisions/{workspaceId}/{path} and returns the parsed list', async () => {
    const list = {
      fileId: 'f-1',
      latestRevision: revision,
      matchingRevision: null,
      revisions: [revision],
      workingCopyETag: '"wc-1"',
    };
    const fetchMock = stubFetch(200, list);

    await expect(WorkspaceApi.listFileRevisions(3, 'foo/bar.seq', null)).resolves.toEqual(list);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://ws/revisions/3/foo/bar.seq',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('createFileRevision POSTs with no body', async () => {
    const fetchMock = stubFetch(201);

    await expect(WorkspaceApi.createFileRevision(3, 'foo/bar.seq', null)).resolves.toEqual(revision);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ws/revisions/3/foo/bar.seq');
    expect(options.method).toBe('POST');
    expect(options.body).toBeUndefined();
  });

  test('getFileRevision and getFileRevisionContent use /revision/{workspaceId}/{revisionId}', async () => {
    let fetchMock = stubFetch(200);
    await WorkspaceApi.getFileRevision(3, 'r-1', null);
    expect(fetchMock.mock.calls[0][0]).toBe('http://ws/revision/3/r-1');

    fetchMock = stubFetch(200, 'old contents');
    await expect(WorkspaceApi.getFileRevisionContent(3, 'r-1', null)).resolves.toBe('old contents');
    expect(fetchMock.mock.calls[0][0]).toBe('http://ws/revision/3/r-1/content');
  });

  test('restoreFileRevision sends the workingCopyETag as If-Match and the revision id as JSON', async () => {
    const fetchMock = stubFetch(200);

    await WorkspaceApi.restoreFileRevision(3, 'foo/bar.seq', 'r-1', '"wc-1"', null);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ws/revisions/restore/3/foo/bar.seq');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({ 'Content-Type': 'application/json', 'If-Match': '"wc-1"' });
    expect(JSON.parse(options.body)).toEqual({ revisionId: 'r-1' });
  });

  test('a stale restore (412) throws WorkspaceSaveConflictError', async () => {
    stubFetch(412, { data: { reason: 'conflict' }, message: 'conflict' });

    await expect(WorkspaceApi.restoreFileRevision(3, 'foo/bar.seq', 'r-1', '"old"', null)).rejects.toBeInstanceOf(
      WorkspaceSaveConflictError,
    );
  });
});
