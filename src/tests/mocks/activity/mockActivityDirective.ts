import type { ActivityDirective } from '../../../types/activity';

/**
 * Build a minimal `ActivityDirective` for use in unit tests. `id` and `plan_id`
 * are required because most call sites care about identity; everything else
 * defaults to a low-noise stub and can be overridden as needed.
 */
export function makeMockActivityDirective(
  overrides: Partial<ActivityDirective> & { id: number; plan_id: number },
): ActivityDirective {
  return {
    anchor_id: null,
    anchored_to_start: true,
    applied_preset: null,
    arguments: {},
    created_at: '2006-07-11T00:00:00',
    created_by: 'admin',
    last_modified_arguments_at: '2006-07-11T00:00:00',
    last_modified_at: '2006-07-11T00:00:00',
    last_modified_by: 'admin',
    metadata: {},
    name: `Activity ${overrides.id}`,
    source_scheduling_goal_id: null,
    source_scheduling_goal_invocation_id: null,
    start_offset: '01:00:00',
    start_time_ms: 0,
    tags: [],
    type: 'foo',
    ...overrides,
  };
}
