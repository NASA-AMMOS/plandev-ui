import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ConsoleEntry } from '../types/console';
import { ErrorTypes } from '../utilities/errors';
import { CompoundError } from '../utilities/requests';
import {
  allLogs,
  catchError,
  clearConsoleEntries,
  errorLogs,
  logMessage,
  consoleEntries,
  schedulingErrors,
} from './console';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$app/environment', () => ({ browser: true }));

function backendError(type: ErrorTypes, service: string, msg = 'something failed'): ConsoleEntry {
  return {
    data: { specification_id: 659 },
    message: msg,
    service,
    timestamp: '2026-05-18T16:10:49Z',
    trace: 'stack',
    type,
  };
}

function compoundFrom(...errors: ConsoleEntry[]): CompoundError {
  return new CompoundError(
    errors[0]?.message ?? 'multi',
    errors.map(e => ({ ...e, level: 'error' })),
  );
}

describe('catchError routes by call-site category', () => {
  beforeEach(() => {
    clearConsoleEntries();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    clearConsoleEntries();
    vi.restoreAllMocks();
  });

  test('thrown Error wraps message prefix and routes to scheduling tab', () => {
    catchError('scheduling', 'Unable to schedule', new Error('boom'));
    expect(get(schedulingErrors)).toHaveLength(1);
    expect(get(schedulingErrors)[0].category).toBe('scheduling');
    expect(get(schedulingErrors)[0].type).toBe(ErrorTypes.CAUGHT_ERROR);
    expect(get(schedulingErrors)[0].message).toContain('Unable to schedule');
    expect(get(schedulingErrors)[0].message).toContain('boom');
    expect(get(allLogs)).toHaveLength(0);
  });

  test('CompoundError fans out to multiple entries with original types preserved', () => {
    const ce = compoundFrom(
      backendError(ErrorTypes.NO_SUCH_PLAN, 'aerie_merlin', 'plan gone'),
      backendError(ErrorTypes.FORBIDDEN, 'aerie_permissions', 'nope'),
    );
    catchError('simulation', 'Simulation failed', ce);
    const errs = get(consoleEntries).filter(e => e.category === 'simulation');
    expect(errs).toHaveLength(2);
    expect(errs[0].type).toBe(ErrorTypes.NO_SUCH_PLAN);
    expect(errs[1].type).toBe(ErrorTypes.FORBIDDEN);
    expect(errs[0].message).toContain('Simulation failed');
  });

  test('ConsoleEntry payload spreads directly (graceful failure path)', () => {
    const reason = backendError(ErrorTypes.NO_SUCH_SCHEDULING_SPECIFICATION, 'aerie_permissions');
    catchError('scheduling', '', reason);
    const errs = get(schedulingErrors);
    expect(errs).toHaveLength(1);
    expect(errs[0].type).toBe(ErrorTypes.NO_SUCH_SCHEDULING_SPECIFICATION);
    expect(errs[0].service).toBe('aerie_permissions');
    expect(errs[0].data).toEqual({ specification_id: 659 });
  });

  test('PR #1777 key case — service=aerie_permissions during scheduling lands in Scheduling tab, not Logs', () => {
    const reason = backendError(
      ErrorTypes.NO_SUCH_SCHEDULING_SPECIFICATION,
      'aerie_permissions',
      'Could not check permissions on scheduling specification 659: specification does not exist.',
    );
    catchError('scheduling', '', reason);
    expect(get(schedulingErrors)).toHaveLength(1);
    expect(get(errorLogs)).toHaveLength(0);
    expect(get(allLogs)).toHaveLength(0);
  });

  test('ignores AbortError without pushing', () => {
    const ae = new Error('aborted');
    ae.name = 'AbortError';
    catchError('scheduling', 'Unable to schedule', ae);
    expect(get(consoleEntries)).toHaveLength(0);
  });

  test('default category="log" lands in allLogs and errorLogs', () => {
    catchError('log', 'Create Failed', new Error('boom'));
    expect(get(allLogs)).toHaveLength(1);
    expect(get(errorLogs)).toHaveLength(1);
    expect(get(schedulingErrors)).toHaveLength(0);
  });

  test('shouldLog=false suppresses console output', () => {
    catchError('log', 'x', new Error('y'), { shouldLog: false });
    expect(console.log).not.toHaveBeenCalled();
  });

  test('options.level=warn applies', () => {
    catchError('log', 'warn me', new Error('w'), { level: 'warn' });
    expect(get(allLogs)[0].level).toBe('warn');
    // errorLogs filters level=error, so warn shouldn't show up there
    expect(get(errorLogs)).toHaveLength(0);
  });
});

describe('logMessage', () => {
  beforeEach(() => clearConsoleEntries());
  afterEach(() => clearConsoleEntries());

  test('pushes an info-level LOG entry under the given category', () => {
    logMessage('scheduling', 'Completed scheduling.', { duration: 1234 });
    const entries = get(consoleEntries);
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe('scheduling');
    expect(entries[0].level).toBe('info');
    expect(entries[0].type).toBe(ErrorTypes.LOG);
    expect(entries[0].duration).toBe(1234);
  });

  test('strips redundant prefix via cleanLogMessage', () => {
    logMessage('log', 'Error: boom');
    expect(get(allLogs)[0].message).toBe('boom');
  });

  test('details become cause', () => {
    logMessage('log', 'msg', { details: 'why' });
    expect(get(allLogs)[0].cause).toBe('why');
  });
});

describe('clearConsoleEntries', () => {
  beforeEach(() => clearConsoleEntries());

  test('no arg clears all categories', () => {
    catchError('scheduling', 'a', new Error('x'));
    catchError('simulation', 'b', new Error('y'));
    catchError('log', 'c', new Error('z'));
    expect(get(consoleEntries)).toHaveLength(3);
    clearConsoleEntries();
    expect(get(consoleEntries)).toHaveLength(0);
  });

  test('category arg clears only that category', () => {
    catchError('scheduling', 'a', new Error('x'));
    catchError('simulation', 'b', new Error('y'));
    clearConsoleEntries('scheduling');
    expect(get(schedulingErrors)).toHaveLength(0);
    expect(get(consoleEntries).filter(e => e.category === 'simulation')).toHaveLength(1);
  });
});
