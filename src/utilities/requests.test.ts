import { afterEach, describe, expect, test, vi } from 'vitest';
import { reqWorkspaceWithMeta, WorkspaceRequestError, WorkspaceSaveConflictError } from './requests';

vi.mock('$env/dynamic/public', () => ({
  env: { PUBLIC_WORKSPACE_CLIENT_URL: 'http://workspace' },
}));

// Minimal Response stand-in: `headers.get` is the only header API the code uses,
// so a plain object avoids depending on a global `Headers` implementation.
function mockResponse(opts: {
  headers?: Record<string, string>;
  jsonBody?: unknown;
  status: number;
  textBody?: string;
}): Response {
  return {
    headers: { get: (name: string) => opts.headers?.[name] ?? null },
    json: async () => opts.jsonBody,
    ok: opts.status >= 200 && opts.status < 300,
    status: opts.status,
    text: async () => opts.textBody ?? '',
  } as unknown as Response;
}

describe('reqWorkspaceWithMeta', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns data, the ETag header, and the status on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockResponse({ headers: { ETag: '"tok-1"' }, status: 200, textBody: 'file contents' })),
    );

    const result = await reqWorkspaceWithMeta<string>('1/foo.seq', 'GET', null, null);

    expect(result).toEqual({ data: 'file contents', etag: '"tok-1"', status: 200 });
  });

  test('returns a null etag when the ETag header is absent (CORS not exposed)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ status: 200, textBody: 'x' })));

    const result = await reqWorkspaceWithMeta<string>('1/foo.seq', 'GET', null, null);

    expect(result.etag).toBeNull();
  });

  test('throws a typed WorkspaceSaveConflictError with parsed fields on a 412 conflict', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({
          jsonBody: {
            data: {
              currentETag: '"server-tok"',
              lastEditedAt: '2026-06-11T12:00:00Z',
              lastEditedBy: 'alice@example.com',
              reason: 'conflict',
            },
            message: 'conflict!',
            type: 'SAVE_CONFLICT',
          },
          status: 412,
        }),
      ),
    );

    await expect(reqWorkspaceWithMeta('1/foo.seq', 'PUT', null, null)).rejects.toMatchObject({
      currentETag: '"server-tok"',
      lastEditedAt: '2026-06-11T12:00:00Z',
      lastEditedBy: 'alice@example.com',
      name: 'WorkspaceSaveConflictError',
      reason: 'conflict',
    });
  });

  test('maps a 412 with reason "deleted" to the deleted variant with a null currentETag', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(mockResponse({ jsonBody: { data: { currentETag: null, reason: 'deleted' } }, status: 412 })),
    );

    let error: unknown;
    try {
      await reqWorkspaceWithMeta('1/foo.seq', 'PUT', null, null);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(WorkspaceSaveConflictError);
    expect((error as WorkspaceSaveConflictError).reason).toBe('deleted');
    expect((error as WorkspaceSaveConflictError).currentETag).toBeNull();
  });

  test('defaults to a "conflict" reason when the 412 body is missing or unparseable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        headers: { get: () => null },
        json: async () => {
          throw new Error('not json');
        },
        ok: false,
        status: 412,
        text: async () => '',
      } as unknown as Response),
    );

    let error: unknown;
    try {
      await reqWorkspaceWithMeta('1/foo.seq', 'PUT', null, null);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(WorkspaceSaveConflictError);
    expect((error as WorkspaceSaveConflictError).reason).toBe('conflict');
    expect((error as WorkspaceSaveConflictError).currentETag).toBeNull();
  });

  test('throws a typed WorkspaceRequestError carrying the HTTP status on other non-ok responses', async () => {
    // The status lets callers (e.g. the conflict modal) distinguish a definite 404 — file
    // genuinely deleted — from a transient 5xx/network failure they should not treat as deletion.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ status: 404 })));
    let notFound: unknown;
    try {
      await reqWorkspaceWithMeta('1/foo.seq', 'GET', null, null);
    } catch (e) {
      notFound = e;
    }
    expect(notFound).toBeInstanceOf(WorkspaceRequestError);
    expect(notFound).not.toBeInstanceOf(WorkspaceSaveConflictError);
    expect((notFound as WorkspaceRequestError).status).toBe(404);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ status: 500 })));
    let serverError: unknown;
    try {
      await reqWorkspaceWithMeta('1/foo.seq', 'GET', null, null);
    } catch (e) {
      serverError = e;
    }
    expect((serverError as WorkspaceRequestError).status).toBe(500);
  });
});
