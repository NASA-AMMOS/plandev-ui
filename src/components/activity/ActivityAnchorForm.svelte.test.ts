import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { ActivitiesMap, Activity } from '../../types/activity';
import ActivityAnchorForm from './ActivityAnchorForm.svelte';

describe('Activity Decomposition component', () => {
  const activitiesMap: ActivitiesMap = {
    directive_12_12: {
      anchor_id: null,
      anchored_to_start: true,
      arguments: {},
      attributes: {
        arguments: {},
        computedAttributes: {},
      },
      childUniqueIds: [],
      created_at: '2022-08-03T18:21:51.954599+00:00',
      duration: '0',
      id: 12,
      last_modified_at: '2022-08-03T21:53:22.093235+00:00',
      metadata: {},
      name: 'parent 1',
      parentUniqueId: null,
      parent_id: null,
      plan_id: 12,
      simulated_activity_id: 29,
      source_scheduling_goal_id: null,
      start_offset: '00:00:00.00',
      start_time_doy: '2023-005T00:00:00',
      tags: [],
      type: 'parent',
      unfinished: false,
      uniqueId: 'directive_12_12',
    },
    directive_12_13: {
      anchor_id: 12,
      anchored_to_start: true,
      arguments: {},
      attributes: {
        arguments: {},
        computedAttributes: {},
      },
      childUniqueIds: [],
      created_at: '2022-08-03T18:21:51.954599+00:00',
      duration: '0',
      id: 13,
      last_modified_at: '2022-08-03T21:53:22.093235+00:00',
      metadata: {},
      name: 'child 1',
      parentUniqueId: null,
      parent_id: null,
      plan_id: 12,
      simulated_activity_id: 68,
      source_scheduling_goal_id: null,
      start_offset: '00:10:00.00',
      start_time_doy: '2023-005T10:00:00',
      tags: [],
      type: 'parent',
      unfinished: false,
      uniqueId: 'directive_12_13',
    },
    directive_12_14: {
      anchor_id: 12,
      anchored_to_start: true,
      arguments: {},
      attributes: {
        arguments: {},
        computedAttributes: {},
      },
      childUniqueIds: [],
      created_at: '2022-08-03T18:21:51.954599+00:00',
      duration: '0',
      id: 14,
      last_modified_at: '2022-08-03T21:53:22.093235+00:00',
      metadata: {},
      name: 'child 2',
      parentUniqueId: null,
      parent_id: null,
      plan_id: 12,
      simulated_activity_id: 69,
      source_scheduling_goal_id: null,
      start_offset: '11:00:00.00',
      start_time_doy: '2023-005T11:00:00',
      tags: [],
      type: 'parent',
      unfinished: false,
      uniqueId: 'directive_12_14',
    },
    directive_12_5: {
      anchor_id: 13,
      anchored_to_start: true,
      arguments: {},
      attributes: {
        arguments: {},
        computedAttributes: {},
      },
      childUniqueIds: [],
      created_at: '2022-08-03T18:21:51.954599+00:00',
      duration: '0',
      id: 15,
      last_modified_at: '2022-08-03T21:53:22.093235+00:00',
      metadata: {},
      name: 'child 3',
      parentUniqueId: null,
      parent_id: null,
      plan_id: 12,
      simulated_activity_id: 70,
      source_scheduling_goal_id: null,
      start_offset: '09:00:00.00',
      start_time_doy: '2023-005T09:00:00',
      tags: [],
      type: 'parent',
      unfinished: false,
      uniqueId: 'directive_12_5',
    },
  };
  afterEach(() => {
    cleanup();
  });

  it('Should not render the form if no anchor is initially present', () => {
    const activity: Activity = activitiesMap['directive_12_12'];

    const { getAllByRole } = render(ActivityAnchorForm, {
      activitiesMap,
      activity,
      anchorId: activity.anchor_id,
      isAnchoredToStart: activity.anchored_to_start,
      planId: activity.plan_id,
      startOffset: activity.start_offset,
    });

    expect(getAllByRole('group').at(1).hasAttribute('open')).toEqual(false);
  });

  it('Should render the form when an anchor is initially present', () => {
    const activity: Activity = activitiesMap['directive_12_13'];

    const { getAllByRole } = render(ActivityAnchorForm, {
      activitiesMap,
      activity,
      anchorId: activity.anchor_id,
      isAnchoredToStart: activity.anchored_to_start,
      planId: activity.plan_id,
      startOffset: activity.start_offset,
    });

    expect(getAllByRole('group').at(1).hasAttribute('open')).toEqual(true);
  });
});
