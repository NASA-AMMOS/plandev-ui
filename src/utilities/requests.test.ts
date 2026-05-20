import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { BaseUser } from '../types/app';
import { ErrorTypes } from './errors';
import { CompoundError, reqHasura, reqWorkspace } from './requests';

vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_HASURA_CLIENT_URL: 'http://test/hasura',
    PUBLIC_HASURA_SERVER_URL: 'http://test/hasura',
    PUBLIC_WORKSPACE_CLIENT_URL: 'http://test/ws',
  },
}));

vi.mock('$app/environment', () => ({ browser: true }));

vi.mock('./login', () => ({ logout: vi.fn() }));

const user: BaseUser = { id: 'test-user', token: 'test-token' };

function mockHasuraResponse(body: unknown, ok = true, status = 200): void {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(body),
    ok,
    status,
    statusText: ok ? 'OK' : 'Server Error',
  } as unknown as Response);
}

describe('reqHasura error parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('extracts extensions.type from a formatted backend error (PR #1777 example)', async () => {
    mockHasuraResponse({
      errors: [
        {
          extensions: {
            data: { specification_id: 659 },
            message: 'Could not check permissions on scheduling specification 659: specification does not exist.',
            service: 'aerie_permissions',
            timestamp: '2026-05-18T16:10:49.084229462Z',
            trace: 'at gov.nasa.jpl.aerie...',
            type: 'NO_SUCH_SCHEDULING_SPECIFICATION',
          },
          message: 'Could not check permissions on scheduling specification 659: specification does not exist.',
        },
      ],
    });

    await expect(reqHasura('query { x }', {}, user)).rejects.toMatchObject({
      errors: [
        {
          data: { specification_id: 659 },
          message: 'Could not check permissions on scheduling specification 659: specification does not exist.',
          service: 'aerie_permissions',
          timestamp: '2026-05-18T16:10:49.084229462Z',
          trace: 'at gov.nasa.jpl.aerie...',
          type: ErrorTypes.NO_SUCH_SCHEDULING_SPECIFICATION,
        },
      ],
      name: 'CompoundError',
    });
  });

  test('preserves cause and trace as separate fields', async () => {
    mockHasuraResponse({
      errors: [
        {
          extensions: {
            cause: 'root-cause text',
            service: 'aerie_merlin',
            trace: 'stack-trace text',
            type: 'NO_SUCH_PLAN',
          },
          message: 'Plan not found',
        },
      ],
    });

    try {
      await reqHasura('query { x }', {}, user);
    } catch (e) {
      expect(e).toBeInstanceOf(CompoundError);
      const ce = e as CompoundError;
      expect(ce.errors[0].cause).toBe('root-cause text');
      expect(ce.errors[0].trace).toBe('stack-trace text');
      expect(ce.errors[0].type).toBe(ErrorTypes.NO_SUCH_PLAN);
    }
    expect.assertions(4);
  });

  test('falls back to CAUGHT_ERROR when extensions.type is missing', async () => {
    mockHasuraResponse({
      errors: [
        {
          extensions: { service: 'aerie_merlin' },
          message: 'A vague error',
        },
      ],
    });

    try {
      await reqHasura('query { x }', {}, user);
    } catch (e) {
      const ce = e as CompoundError;
      expect(ce.errors[0].type).toBe(ErrorTypes.CAUGHT_ERROR);
      expect(ce.errors[0].service).toBe('aerie_merlin');
      expect(ce.errors[0].message).toBe('A vague error');
    }
    expect.assertions(3);
  });

  test('does not use extensions.type for Hasura postgres errors (code=unexpected)', async () => {
    mockHasuraResponse({
      errors: [
        {
          extensions: {
            code: 'unexpected',
            internal: { error: { message: 'pg fk constraint violated' } },
          },
          message: 'unexpected',
        },
      ],
    });

    try {
      await reqHasura('query { x }', {}, user);
    } catch (e) {
      const ce = e as CompoundError;
      expect(ce.errors[0].type).toBe(ErrorTypes.CAUGHT_ERROR);
      expect(ce.errors[0].message).toBe('pg fk constraint violated');
    }
    expect.assertions(2);
  });

  test('does not use extensions.type for Hasura parse-failed errors', async () => {
    mockHasuraResponse({
      errors: [
        {
          extensions: {
            code: 'parse-failed',
            internal: { response: { body: { errors: ['nested error A', 'nested error B'] } } },
            type: 'NO_SUCH_PLAN', // should be ignored — this is a Hasura-level error
          },
          message: 'parse failed',
        },
      ],
    });

    try {
      await reqHasura('query { x }', {}, user);
    } catch (e) {
      const ce = e as CompoundError;
      expect(ce.errors).toHaveLength(2);
      expect(ce.errors[0].type).toBe(ErrorTypes.CAUGHT_ERROR);
      expect(ce.errors[0].message).toBe('nested error A');
      expect(ce.errors[1].message).toBe('nested error B');
    }
    expect.assertions(4);
  });

  test('returns data when there are no errors', async () => {
    mockHasuraResponse({ data: { plan: { id: 1, name: 'Test' } } });
    const data = await reqHasura<{ id: number; name: string }>('query { plan { id name } }', {}, user);
    expect(data).toEqual({ plan: { id: 1, name: 'Test' } });
  });

  test('throws CompoundError when response is not OK', async () => {
    mockHasuraResponse({}, false, 500);
    await expect(reqHasura('query { x }', {}, user)).rejects.toBeInstanceOf(CompoundError);
  });
});

function mockWorkspaceResponse(body: unknown, ok = true, status = 200): void {
  global.fetch = vi.fn().mockResolvedValue({
    blob: () => Promise.resolve(new Blob()),
    json: () => Promise.resolve(body),
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    text: () => Promise.resolve(''),
  } as unknown as Response);
}

describe('reqWorkspace error parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('parses a raw FormattedError body and throws CompoundError with full metadata', async () => {
    mockWorkspaceResponse(
      {
        data: { workspace_id: 42 },
        message: 'Could not find workspace 42.',
        service: 'aerie_workspace',
        timestamp: '2026-05-20T16:10:49Z',
        trace: 'at gov.nasa.jpl.aerie.workspace...',
        type: 'NO_SUCH_WORKSPACE',
      },
      false,
      404,
    );

    try {
      await reqWorkspace('files/foo', 'GET', null, user);
    } catch (e) {
      expect(e).toBeInstanceOf(CompoundError);
      const ce = e as CompoundError;
      expect(ce.errors[0].type).toBe('NO_SUCH_WORKSPACE');
      expect(ce.errors[0].service).toBe('aerie_workspace');
      expect(ce.errors[0].message).toBe('Could not find workspace 42.');
      expect(ce.errors[0].data).toEqual({ workspace_id: 42 });
      expect(ce.errors[0].timestamp).toBe('2026-05-20T16:10:49Z');
      expect(ce.errors[0].level).toBe('error');
    }
    expect.assertions(7);
  });

  test('falls back to plain Error when the body is not a FormattedError shape', async () => {
    mockWorkspaceResponse({ unrelated: 'shape' }, false, 500);
    await expect(reqWorkspace('files/foo', 'GET', null, user)).rejects.toBeInstanceOf(Error);
    await expect(reqWorkspace('files/foo', 'GET', null, user)).rejects.not.toBeInstanceOf(CompoundError);
  });

  test('falls back to plain Error when the body is not JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.reject(new SyntaxError('not json')),
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    } as unknown as Response);

    await expect(reqWorkspace('files/foo', 'GET', null, user)).rejects.toThrow('Bad Gateway');
  });
});
