/**
 * Pure helpers for translating the cross-plan activity search form state into
 * Hasura `where` clauses. Kept separate from `effects.ts` so the clause logic
 * can be unit-tested without pulling in the full effects module's dependency
 * graph (stores, requests, modals, etc.).
 */

export interface ActivitySearchFilters {
  actName: string;
  actType: string[];
  args: [name: string, value: string | number | boolean][];
  createdAfter: string;
  createdBefore: string;
  createdBy: string;
  lastModifiedAfter: string;
  lastModifiedBefore: string;
  lastModifiedBy: string;
  modelId: number | undefined;
  planName: string;
  planOwner: string;
  planTag: string;
  preset: string;
  schedulerCreatedOnly: boolean;
  schedulingGoalId: string;
  startOffsetMax: string;
  startOffsetMin: string;
  tagValue: string;
}

export type ActivitySearchClause = Record<string, unknown>;

/**
 * Build the array of clauses to AND together for the SEARCH_ACTIVITIES query.
 *
 * Each filter contributes at most one clause; falsy values are skipped so the
 * resulting array contains only the filters the user actually populated. Args
 * branch on (name, value) presence and value type — see the comments on each
 * branch for the matching Hasura semantics.
 */
export function buildSearchActivitiesWhereClauses(filters: ActivitySearchFilters): ActivitySearchClause[] {
  const clauses: ActivitySearchClause[] = [];

  if (filters.modelId !== undefined && filters.modelId !== null) {
    clauses.push({ plan: { model_id: { _eq: filters.modelId } } });
  }
  if (filters.actType.length > 0) {
    clauses.push({ type: { _in: filters.actType } });
  }
  if (filters.actName) {
    clauses.push({ name: { _ilike: `%${filters.actName}%` } });
  }
  if (filters.tagValue) {
    clauses.push({ tags: { tag: { name: { _eq: filters.tagValue } } } });
  }
  if (filters.preset) {
    clauses.push({ applied_preset: { preset_applied: { name: { _eq: filters.preset } } } });
  }
  if (filters.createdAfter) {
    // datetime-local values (YYYY-MM-DDTHH:MM) are parsed as local time by JS Date
    clauses.push({ created_at: { _gte: new Date(filters.createdAfter).toISOString() } });
  }
  if (filters.createdBefore) {
    clauses.push({ created_at: { _lte: new Date(filters.createdBefore).toISOString() } });
  }
  if (filters.createdBy) {
    clauses.push({ created_by: { _eq: filters.createdBy } });
  }
  if (filters.lastModifiedAfter) {
    clauses.push({ last_modified_at: { _gte: new Date(filters.lastModifiedAfter).toISOString() } });
  }
  if (filters.lastModifiedBefore) {
    clauses.push({ last_modified_at: { _lte: new Date(filters.lastModifiedBefore).toISOString() } });
  }
  if (filters.lastModifiedBy) {
    clauses.push({ last_modified_by: { _eq: filters.lastModifiedBy } });
  }
  if (filters.planName) {
    clauses.push({ plan: { name: { _ilike: `%${filters.planName}%` } } });
  }
  if (filters.planOwner) {
    clauses.push({ plan: { owner: { _eq: filters.planOwner } } });
  }
  if (filters.planTag) {
    clauses.push({ plan: { tags: { tag: { name: { _eq: filters.planTag } } } } });
  }
  if (filters.schedulerCreatedOnly) {
    clauses.push({ source_scheduling_goal_id: { _is_null: false } });
  }
  if (filters.schedulingGoalId) {
    clauses.push({ source_scheduling_goal_id: { _eq: parseInt(filters.schedulingGoalId, 10) } });
  }
  if (filters.startOffsetMin) {
    clauses.push({ start_offset: { _gte: filters.startOffsetMin } });
  }
  if (filters.startOffsetMax) {
    clauses.push({ start_offset: { _lte: filters.startOffsetMax } });
  }

  for (const [argName, argValue] of filters.args) {
    if (argName === '' && argValue === '') {
      continue;
    } else if (argName === '') {
      // Substring search across the JSON-stringified arguments blob
      clauses.push({ arguments: { _cast: { String: { _ilike: `%${argValue}%` } } } });
    } else if (argValue === '') {
      // Just check the key exists, regardless of value
      clauses.push({ arguments: { _has_key: argName } });
    } else if (typeof argValue === 'string') {
      // Try to parse as JSON to support typed scalars, arrays, and structs.
      // Fall back to the literal string when parse fails.
      let parsed: unknown = argValue;
      try {
        parsed = JSON.parse(argValue);
      } catch {
        /* keep as string */
      }

      const isScalar = parsed === null || typeof parsed !== 'object';

      if (isScalar) {
        // For scalar inputs, also match against singleton-array shape so typing
        // `5` matches `XYZ: 5` and `XYZ: [1, 2, 5]`.
        clauses.push({
          _or: [
            { arguments: { _contains: { [argName]: parsed } } },
            { arguments: { _contains: { [argName]: [parsed] } } },
          ],
        });
      } else {
        // Arrays / structs — let jsonb containment do subset / sub-object matching.
        clauses.push({ arguments: { _contains: { [argName]: parsed } } });
      }
    } else if (typeof argValue === 'number' || typeof argValue === 'boolean') {
      // Typed scalars from the form (numbers / booleans the upstream coerced from
      // a user-typed string). Match four shapes to cover storage variations and
      // array-element matching (typing `5` finds `XYZ: [1, 2, 5]`):
      //   1. typed scalar
      //   2. stringified scalar (some directives store values as strings)
      //   3. member of a typed-scalar array
      //   4. member of a stringified-scalar array
      const str = argValue.toString();
      clauses.push({
        _or: [
          { arguments: { _contains: { [argName]: argValue } } },
          { arguments: { _contains: { [argName]: str } } },
          { arguments: { _contains: { [argName]: [argValue] } } },
          { arguments: { _contains: { [argName]: [str] } } },
        ],
      });
    }
  }

  return clauses;
}
