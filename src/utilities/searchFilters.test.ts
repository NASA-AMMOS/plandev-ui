import { describe, expect, test } from 'vitest';
import {
  buildSearchActivitiesWhereClauses,
  type ActivitySearchClause,
  type ActivitySearchFilters,
} from './searchFilters';

const EMPTY_FILTERS: ActivitySearchFilters = {
  actName: '',
  actType: '',
  args: [],
  createdBy: '',
  lastModifiedAfter: '',
  lastModifiedBefore: '',
  modelId: undefined,
  planName: '',
  planOwner: '',
  preset: '',
  schedulerCreatedOnly: false,
  startOffsetMax: '',
  startOffsetMin: '',
  tagValue: '',
};

function withFilters(overrides: Partial<ActivitySearchFilters>): ActivitySearchFilters {
  return { ...EMPTY_FILTERS, ...overrides };
}

describe('buildSearchActivitiesWhereClauses', () => {
  test('Should return an empty array for empty filters', () => {
    expect(buildSearchActivitiesWhereClauses(EMPTY_FILTERS)).toEqual([]);
  });

  describe('top-level filters', () => {
    test('Should emit a model_id clause when modelId is set', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ modelId: 7 }))).toEqual([
        { plan: { model_id: { _eq: 7 } } },
      ]);
    });

    test('Should not emit a model_id clause when modelId is undefined or null', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ modelId: undefined }))).toEqual([]);
      expect(buildSearchActivitiesWhereClauses(withFilters({ modelId: null as unknown as undefined }))).toEqual([]);
    });

    test('Should emit a model_id clause when modelId is 0 (valid id)', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ modelId: 0 }))).toEqual([
        { plan: { model_id: { _eq: 0 } } },
      ]);
    });

    test('Should emit an _eq clause for actType', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ actType: 'GrowBanana' }))).toEqual([
        { type: { _eq: 'GrowBanana' } },
      ]);
    });

    test('Should emit a substring _ilike clause for actName', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ actName: 'foo' }))).toEqual([
        { name: { _ilike: '%foo%' } },
      ]);
    });

    test('Should emit a nested clause for tagValue', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ tagValue: 'critical' }))).toEqual([
        { tags: { tag: { name: { _eq: 'critical' } } } },
      ]);
    });

    test('Should emit a nested clause for preset', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ preset: 'HighRes' }))).toEqual([
        { applied_preset: { preset_applied: { name: { _eq: 'HighRes' } } } },
      ]);
    });

    test('Should emit an _eq clause for createdBy', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ createdBy: 'alice' }))).toEqual([
        { created_by: { _eq: 'alice' } },
      ]);
    });

    test('Should emit a substring _ilike clause for planName', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ planName: 'Cruise' }))).toEqual([
        { plan: { name: { _ilike: '%Cruise%' } } },
      ]);
    });

    test('Should emit an _eq clause for planOwner', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ planOwner: 'bob' }))).toEqual([
        { plan: { owner: { _eq: 'bob' } } },
      ]);
    });

    test('Should emit an _is_null:false clause when schedulerCreatedOnly is true', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ schedulerCreatedOnly: true }))).toEqual([
        { source_scheduling_goal_id: { _is_null: false } },
      ]);
    });

    test('Should not emit a clause when schedulerCreatedOnly is false', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ schedulerCreatedOnly: false }))).toEqual([]);
    });

    test('Should emit start_offset _gte for startOffsetMin', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ startOffsetMin: '01:00:00' }))).toEqual([
        { start_offset: { _gte: '01:00:00' } },
      ]);
    });

    test('Should emit start_offset _lte for startOffsetMax', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ startOffsetMax: '02:00:00' }))).toEqual([
        { start_offset: { _lte: '02:00:00' } },
      ]);
    });
  });

  describe('lastModified date range', () => {
    test('Should convert lastModifiedAfter to an ISO string in a _gte clause', () => {
      const clauses = buildSearchActivitiesWhereClauses(withFilters({ lastModifiedAfter: '2026-01-15T08:30' }));
      expect(clauses).toHaveLength(1);
      const clause = clauses[0] as { last_modified_at: { _gte: string } };
      expect(clause.last_modified_at._gte).toEqual(new Date('2026-01-15T08:30').toISOString());
    });

    test('Should convert lastModifiedBefore to an ISO string in a _lte clause', () => {
      const clauses = buildSearchActivitiesWhereClauses(withFilters({ lastModifiedBefore: '2026-02-01T00:00' }));
      expect(clauses).toHaveLength(1);
      const clause = clauses[0] as { last_modified_at: { _lte: string } };
      expect(clause.last_modified_at._lte).toEqual(new Date('2026-02-01T00:00').toISOString());
    });
  });

  describe('args filter', () => {
    test('Should skip a tuple with empty name and empty value', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ args: [['', '']] }))).toEqual([]);
    });

    test('Should emit an _ilike on the cast string when name is empty and value is set', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ args: [['', 'banana']] }))).toEqual([
        { arguments: { _cast: { String: { _ilike: '%banana%' } } } },
      ]);
    });

    test('Should emit a _has_key clause when name is set and value is empty', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ args: [['quantity', '']] }))).toEqual([
        { arguments: { _has_key: 'quantity' } },
      ]);
    });

    test('Should emit a _contains clause for a string value', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ args: [['region', 'arctic']] }))).toEqual([
        { arguments: { _contains: { region: 'arctic' } } },
      ]);
    });

    test('Should emit an _or clause covering both typed and stringified forms for numeric values', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ args: [['quantity', 5]] }))).toEqual([
        {
          _or: [{ arguments: { _contains: { quantity: 5 } } }, { arguments: { _contains: { quantity: '5' } } }],
        },
      ]);
    });

    test('Should emit an _or clause covering both typed and stringified forms for boolean values', () => {
      expect(buildSearchActivitiesWhereClauses(withFilters({ args: [['enabled', true]] }))).toEqual([
        {
          _or: [{ arguments: { _contains: { enabled: true } } }, { arguments: { _contains: { enabled: 'true' } } }],
        },
      ]);
    });

    test('Should emit one clause per non-empty arg tuple in order', () => {
      const clauses = buildSearchActivitiesWhereClauses(
        withFilters({
          args: [
            ['', ''],
            ['region', 'arctic'],
            ['quantity', 3],
          ],
        }),
      );
      expect(clauses).toHaveLength(2);
      expect(clauses[0]).toEqual({ arguments: { _contains: { region: 'arctic' } } });
      expect(clauses[1]).toEqual({
        _or: [{ arguments: { _contains: { quantity: 3 } } }, { arguments: { _contains: { quantity: '3' } } }],
      });
    });
  });

  describe('combined filters', () => {
    test('Should aggregate every populated filter into the result array', () => {
      const clauses = buildSearchActivitiesWhereClauses({
        actName: 'Foo',
        actType: 'GrowBanana',
        args: [['quantity', 5]],
        createdBy: 'alice',
        lastModifiedAfter: '2026-01-01T00:00',
        lastModifiedBefore: '2026-12-31T23:59',
        modelId: 3,
        planName: 'Cruise',
        planOwner: 'bob',
        preset: 'HighRes',
        schedulerCreatedOnly: true,
        startOffsetMax: '07:00:00',
        startOffsetMin: '01:00:00',
        tagValue: 'critical',
      });

      // 13 top-level filters + 1 args clause
      expect(clauses).toHaveLength(14);

      const expected: ActivitySearchClause[] = [
        { plan: { model_id: { _eq: 3 } } },
        { type: { _eq: 'GrowBanana' } },
        { name: { _ilike: '%Foo%' } },
        { tags: { tag: { name: { _eq: 'critical' } } } },
        { applied_preset: { preset_applied: { name: { _eq: 'HighRes' } } } },
        { created_by: { _eq: 'alice' } },
      ];
      for (let i = 0; i < expected.length; i++) {
        expect(clauses[i]).toEqual(expected[i]);
      }
    });
  });
});
