/**
 * Pure helpers for translating the cross-plan activity search form state into
 * Hasura `where` clauses. Kept separate from `effects.ts` so the clause logic
 * can be unit-tested without pulling in the full effects module's dependency
 * graph (stores, requests, modals, etc.).
 */

export interface ActivitySearchFilters {
  actName: string;
  actType: string;
  args: [name: string, value: string | number | boolean][];
  createdBy: string;
  lastModifiedAfter: string;
  lastModifiedBefore: string;
  modelId: number | undefined;
  planName: string;
  planOwner: string;
  preset: string;
  schedulerCreatedOnly: boolean;
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
  if (filters.actType) {
    clauses.push({ type: { _eq: filters.actType } });
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
  if (filters.createdBy) {
    clauses.push({ created_by: { _eq: filters.createdBy } });
  }
  if (filters.lastModifiedAfter) {
    // datetime-local values (YYYY-MM-DDTHH:MM) are parsed as local time by JS Date
    clauses.push({ last_modified_at: { _gte: new Date(filters.lastModifiedAfter).toISOString() } });
  }
  if (filters.lastModifiedBefore) {
    clauses.push({ last_modified_at: { _lte: new Date(filters.lastModifiedBefore).toISOString() } });
  }
  if (filters.planName) {
    clauses.push({ plan: { name: { _ilike: `%${filters.planName}%` } } });
  }
  if (filters.planOwner) {
    clauses.push({ plan: { owner: { _eq: filters.planOwner } } });
  }
  if (filters.schedulerCreatedOnly) {
    clauses.push({ source_scheduling_goal_id: { _is_null: false } });
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
      clauses.push({ arguments: { _contains: { [argName]: argValue } } });
    } else if (typeof argValue === 'number' || typeof argValue === 'boolean') {
      // JSON values can be stored either as their native type or as a string
      // representation (depending on how the directive was created), so match
      // both to avoid false negatives.
      clauses.push({
        _or: [
          { arguments: { _contains: { [argName]: argValue } } },
          { arguments: { _contains: { [argName]: argValue.toString() } } },
        ],
      });
    }
  }

  return clauses;
}
