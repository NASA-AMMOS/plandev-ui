import type { ActionValueSchema } from '@nasa-jpl/plandev-actions';
import { describe, expect, test } from 'vitest';
import { Status } from '../enums/status';
import type { ActionDefinition, ActionDefinitionVersion, ActionRunSlim } from '../types/actions';
import type { ParametersMap } from '../types/parameter';
import {
  getActionDefinitionForRun,
  getDefaultsFromSchema,
  getLatestRunnableVersion,
  getRunnableVersions,
  getStatusForActionRun,
  parseActionLogLines,
  truncateRunParameters,
  valueSchemaRecordToParametersMap,
} from './actions';

function createVersion(overrides: Partial<ActionDefinitionVersion> = {}): ActionDefinitionVersion {
  return {
    action_definition_id: 1,
    action_file_id: 1,
    archived: false,
    author: null,
    created_at: '',
    parameter_schema: {},
    revision: 0,
    settings_schema: {},
    ...overrides,
  };
}

function createActionDefinition(overrides: Partial<ActionDefinition> = {}): ActionDefinition {
  return {
    archived: false,
    created_at: '',
    description: '',
    id: 1,
    name: '',
    owner: '',
    settings: {},
    updated_at: '',
    updated_by: '',
    versions: [createVersion()],
    workspace_id: 1,
    ...overrides,
  };
}

test('valueSchemaRecordToParametersMap', () => {
  const schema: Record<string, ActionValueSchema> = {
    a: { type: 'boolean' },
    b: { type: 'int' },
  };
  const expectedResult: ParametersMap = {
    a: { order: 0, schema: { type: 'boolean' } },
    b: { order: 1, schema: { type: 'int' } },
  };
  expect(valueSchemaRecordToParametersMap(schema)).to.deep.eq(expectedResult);
});

test('getActionDefinitionForRun', () => {
  const actionRun: ActionRunSlim = {
    action_definition: {
      workspace_id: 1,
    },
    action_definition_id: 1,
    action_definition_revision: 0,
    canceled: false,
    duration: 1,
    error: null,
    id: 1,
    logs: null,
    parameters: {},
    requested_at: '',
    requested_by: '',
    results: null,
    settings: {},
    status: 'pending',
  };
  const actionDefinition = createActionDefinition();
  const actionDefinitionsByWorkspace: Record<number, Record<number, ActionDefinition>> = {
    1: {
      1: actionDefinition,
      2: { ...actionDefinition, id: 2 },
    },
    2: {
      1: { ...actionDefinition, id: 3 },
      2: { ...actionDefinition, id: 4 },
    },
  };
  expect(getActionDefinitionForRun(actionRun, actionDefinitionsByWorkspace, 1)).to.deep.eq(actionDefinition);
});

describe('getRunnableVersions', () => {
  test('returns all non-archived versions', () => {
    const versions = [createVersion({ revision: 1 }), createVersion({ revision: 2 }), createVersion({ revision: 3 })];
    expect(getRunnableVersions(versions)).toHaveLength(3);
  });

  test('filters out archived versions', () => {
    const versions = [
      createVersion({ archived: true, revision: 1 }),
      createVersion({ revision: 2 }),
      createVersion({ archived: true, revision: 3 }),
    ];
    const result = getRunnableVersions(versions);
    expect(result).toHaveLength(1);
    expect(result[0].revision).toBe(2);
  });

  test('returns empty array when all versions are archived', () => {
    const versions = [createVersion({ archived: true, revision: 1 }), createVersion({ archived: true, revision: 2 })];
    expect(getRunnableVersions(versions)).toHaveLength(0);
  });

  test('returns empty array for empty input', () => {
    expect(getRunnableVersions([])).toHaveLength(0);
  });
});

describe('getLatestRunnableVersion', () => {
  test('returns first non-archived version', () => {
    const versions = [createVersion({ revision: 3 }), createVersion({ revision: 2 }), createVersion({ revision: 1 })];
    expect(getLatestRunnableVersion(versions)?.revision).toBe(3);
  });

  test('skips archived versions to find first non-archived', () => {
    const versions = [
      createVersion({ archived: true, revision: 3 }),
      createVersion({ revision: 2 }),
      createVersion({ revision: 1 }),
    ];
    expect(getLatestRunnableVersion(versions)?.revision).toBe(2);
  });

  test('returns null when all versions are archived', () => {
    const versions = [createVersion({ archived: true, revision: 1 })];
    expect(getLatestRunnableVersion(versions)).toBeNull();
  });

  test('returns null for empty array', () => {
    expect(getLatestRunnableVersion([])).toBeNull();
  });
});

describe('getDefaultsFromSchema', () => {
  test('extracts default values from schema entries', () => {
    const schema: Record<string, ActionValueSchema> = {
      count: { defaultValue: 10, type: 'int' },
      name: { defaultValue: 'hello', type: 'string' },
    };
    expect(getDefaultsFromSchema(schema)).toEqual({ count: 10, name: 'hello' });
  });

  test('skips entries without defaultValue', () => {
    const schema: Record<string, ActionValueSchema> = {
      optional: { type: 'string' },
      required: { defaultValue: 'yes', type: 'string' },
    };
    expect(getDefaultsFromSchema(schema)).toEqual({ required: 'yes' });
  });

  test('returns empty object for empty schema', () => {
    expect(getDefaultsFromSchema({})).toEqual({});
  });
});

describe('getStatusForActionRun', () => {
  function createRun(overrides: Partial<ActionRunSlim> = {}): ActionRunSlim {
    return {
      action_definition: { workspace_id: 1 },
      action_definition_id: 1,
      action_definition_revision: 0,
      canceled: false,
      duration: null,
      error: null,
      id: 1,
      logs: null,
      parameters: {},
      requested_at: '',
      requested_by: '',
      results: null,
      settings: {},
      status: 'pending',
      ...overrides,
    };
  }

  test('returns Canceled when run is canceled', () => {
    expect(getStatusForActionRun(createRun({ canceled: true }))).toBe(Status.Canceled);
  });

  test('returns Failed when error message exists', () => {
    expect(getStatusForActionRun(createRun({ error: { message: 'oops', stack: undefined } }))).toBe(Status.Failed);
  });

  test('returns Failed when results status is FAILED', () => {
    expect(getStatusForActionRun(createRun({ results: { data: null, status: 'FAILED' } }))).toBe(Status.Failed);
  });

  test('returns Complete for success status', () => {
    expect(getStatusForActionRun(createRun({ status: 'success' }))).toBe(Status.Complete);
  });

  test('returns Pending for pending status', () => {
    expect(getStatusForActionRun(createRun({ status: 'pending' }))).toBe(Status.Pending);
  });

  test('returns Incomplete for incomplete status', () => {
    expect(getStatusForActionRun(createRun({ status: 'incomplete' }))).toBe(Status.Incomplete);
  });

  test('returns Failed for failed status', () => {
    expect(getStatusForActionRun(createRun({ status: 'failed' }))).toBe(Status.Failed);
  });
});

describe('truncateRunParameters', () => {
  test('returns empty string with no parameters', () => {
    expect(truncateRunParameters({}, {})).toBe('');
  });

  test('formats a single parameter', () => {
    const params = { name: 'test' };
    const schema: Record<string, ActionValueSchema> = { name: { type: 'string' } };
    expect(truncateRunParameters(params, schema)).toBe("name: 'test'");
  });

  test('formats multiple parameters', () => {
    const params = { count: 5, name: 'test' };
    const schema: Record<string, ActionValueSchema> = {
      count: { type: 'int' },
      name: { type: 'string' },
    };
    expect(truncateRunParameters(params, schema)).toBe("count: 5, name: 'test'");
  });

  test('truncates when exceeding maxLength', () => {
    const params = { longKey: 'a very long value that should cause truncation' };
    const schema: Record<string, ActionValueSchema> = { longKey: { type: 'string' } };
    const result = truncateRunParameters(params, schema, 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result).toContain('...');
  });

  test('prioritizes primary parameters', () => {
    const params = { other: 'second', primary: 'first' };
    const schema: Record<string, ActionValueSchema> = {
      other: { type: 'string' },
      primary: { primary: true, type: 'string' } as ActionValueSchema,
    };
    const result = truncateRunParameters(params, schema);
    expect(result).toMatch(/^primary:/);
  });
});

describe('parseActionLogLines', () => {
  test('parses a single well-formed line', () => {
    const result = parseActionLogLines('2026-05-18T12:34:56Z [INFO] starting action');
    expect(result).toEqual([
      {
        level: 'info',
        message: 'starting action',
        timestamp: '2026-05-18T12:34:56Z',
      },
    ]);
  });

  test('merges continuation lines into the previous entry trace', () => {
    const input = [
      '2026-05-18T12:34:58Z [ERROR] failed to validate',
      '  [ERROR]   at validatePlan (validator.ts:12)',
      '  [ERROR]   at run (action.ts:5)',
    ].join('\n');
    const result = parseActionLogLines(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      level: 'error',
      message: 'failed to validate',
      timestamp: '2026-05-18T12:34:58Z',
      trace: '  at validatePlan (validator.ts:12)\n  at run (action.ts:5)',
    });
  });

  test('reassembles {-suffixed JSON continuation into data', () => {
    const input = [
      '2026-05-18T12:34:57Z [INFO] fetching plan {',
      '  [INFO]   "planId": 42,',
      '  [INFO]   "name": "Mars Mission"',
      '  [INFO] }',
    ].join('\n');
    const result = parseActionLogLines(input);
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('fetching plan');
    expect(result[0].data).toEqual({ name: 'Mars Mission', planId: 42 });
    expect(result[0].trace).toBeUndefined();
  });

  test('keeps trace when {-suffix continuation is not valid JSON', () => {
    const input = ['2026-05-18T12:34:57Z [INFO] open brace {', '  [INFO] not actually json'].join('\n');
    const result = parseActionLogLines(input);
    expect(result[0].message).toBe('open brace {');
    expect(result[0].data).toBeUndefined();
    expect(result[0].trace).toBe('not actually json');
  });

  test('returns [] for empty or whitespace-only input', () => {
    expect(parseActionLogLines('')).toEqual([]);
    expect(parseActionLogLines('   \n\n\t  \n')).toEqual([]);
  });

  test('handles orphan continuation line with no preceding main entry', () => {
    const result = parseActionLogLines('  [ERROR] orphan trace line');
    expect(result).toEqual([
      {
        level: 'info',
        message: 'orphan trace line',
        timestamp: '',
      },
    ]);
  });
});
