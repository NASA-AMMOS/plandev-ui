import { env } from '$env/dynamic/public';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { WorkspaceContentType } from '../enums/workspace';
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

function stubFetch(status: number, body: unknown = revision, headers: Record<string, string> = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'object' ? JSON.stringify(body) : body),
  } as unknown as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('WorkspaceApi file revisions', () => {
  beforeEach(() => {
    env.PUBLIC_WORKSPACE_REVISION_NAMING_CONVENTION = 'ALPHABETIC';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('getFileRevisionList GETs /versioning/{workspaceId}/{path} and returns the parsed list', async () => {
    const list = {
      fileId: 'f-1',
      latestRevision: revision,
      matchingRevision: null,
      revisions: [revision],
      workingCopyETag: '"wc-1"',
    };
    const fetchMock = stubFetch(200, list);

    await expect(WorkspaceApi.getFileRevisionList(3, 'foo/bar.seq', null)).resolves.toEqual(list);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://ws/versioning/3/foo/bar.seq',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('createFileRevision POSTs the message, omitting an unset startAtRevision', async () => {
    const fetchMock = stubFetch(201, revision.name);

    await expect(WorkspaceApi.createFileRevision(3, 'foo/bar.seq', 'someEtag', null, null)).resolves.toBe(
      revision.name,
    );
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ws/versioning/3/foo/bar.seq');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ message: null });
  });

  test('createFileRevision omits an empty startAtRevision so the server uses its default', async () => {
    const fetchMock = stubFetch(201, 'a');
    await WorkspaceApi.createFileRevision(3, 'foo/bar.seq', 'someEtag', 'msg', null, '');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ message: 'msg' });
  });

  test('createFileRevision sends a string startAtRevision for a first revision', async () => {
    const fetchMock = stubFetch(201, 'c');
    await expect(WorkspaceApi.createFileRevision(3, 'foo/bar.seq', 'someEtag', 'msg', null, 'c')).resolves.toBe('c');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ message: 'msg', startAtRevision: 'c' });
  });

  test('createFileRevision sends a numeric startAtRevision for a first revision', async () => {
    env.PUBLIC_WORKSPACE_REVISION_NAMING_CONVENTION = 'NUMERIC';
    const fetchMock = stubFetch(201, 3);
    await expect(WorkspaceApi.createFileRevision(3, 'foo/bar.seq', 'someEtag', 'msg', null, 3)).resolves.toBe(3);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ message: 'msg', startAtRevision: 3 });
  });

  test('getFileRevision and getFileRevisionContent use /versioning/{workspaceId}/{revisionId}', async () => {
    let fetchMock = stubFetch(200);
    await WorkspaceApi.getFileRevision(3, 'r-1', 'a', null);
    expect(fetchMock.mock.calls[0][0]).toBe('http://ws/versioning/metadata/3/r-1?revision=a');

    fetchMock = stubFetch(200, 'old contents', { 'x-render-type': WorkspaceContentType.Text });
    await expect(WorkspaceApi.getFileRevisionContent(3, 'r-1', 'a', null)).resolves.toEqual({
      content: 'old contents',
      renderType: WorkspaceContentType.Text,
    });
    expect(fetchMock.mock.calls[0][0]).toBe('http://ws/versioning/3/r-1?revision=a');
  });

  test('restoreFileRevision sends the workingCopyETag as If-Match and the revision id as JSON', async () => {
    const fetchMock = stubFetch(200, 'foo/bar.seq restored to revision r-1');

    await expect(WorkspaceApi.restoreFileRevision(3, 'foo/bar.seq', 'r-1', '"wc-1"', null)).resolves.toBe(
      'foo/bar.seq restored to revision r-1',
    );
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ws/versioning/restore/3/foo/bar.seq?revision=r-1');
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
