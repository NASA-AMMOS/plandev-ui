import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { ActivityDirective, ActivityDirectivesMap } from '../../types/activity';
import ActivityAnchorForm from './ActivityAnchorForm.svelte';

describe('Activity Anchor Form component', () => {
  const activityDirectivesMap: ActivityDirectivesMap = {
    12: {
      anchor_id: null,
      anchored_to_start: true,
      applied_preset: null,
      arguments: {},
      created_at: '2022-08-03T18:21:51',
      id: 12,
      last_modified_arguments_at: '2022-08-03T21:53:22',
      last_modified_at: '2022-08-03T21:53:22',
      metadata: {},
      name: 'parent 1',
      plan_id: 12,
      source_scheduling_goal_id: null,
      start_offset: '00:00:00.00',
      tags: [],
      type: 'parent',
    },
    13: {
      anchor_id: 12,
      anchored_to_start: true,
      applied_preset: null,
      arguments: {},
      created_at: '2022-08-03T18:21:51',
      id: 13,
      last_modified_arguments_at: '2022-08-03T21:53:22',
      last_modified_at: '2022-08-03T21:53:22',
      metadata: {},
      name: 'child 1',
      plan_id: 12,
      source_scheduling_goal_id: null,
      start_offset: '00:10:00.00',
      tags: [],
      type: 'parent',
    },
    14: {
      anchor_id: 12,
      anchored_to_start: true,
      applied_preset: null,
      arguments: {},
      created_at: '2022-08-03T18:21:51',
      id: 14,
      last_modified_arguments_at: '2022-08-03T21:53:22',
      last_modified_at: '2022-08-03T21:53:22',
      metadata: {},
      name: 'child 2',
      plan_id: 12,
      source_scheduling_goal_id: null,
      start_offset: '11:00:00.00',
      tags: [],
      type: 'parent',
    },
    15: {
      anchor_id: 13,
      anchored_to_start: true,
      applied_preset: null,
      arguments: {},
      created_at: '2022-08-03T18:21:51',
      id: 15,
      last_modified_arguments_at: '2022-08-03T21:53:22',
      last_modified_at: '2022-08-03T21:53:22',
      metadata: {},
      name: 'child 3',
      plan_id: 12,
      source_scheduling_goal_id: null,
      start_offset: '09:00:00.00',
      tags: [],
      type: 'parent',
    },
  };

  afterEach(() => {
    cleanup();
  });

  it('Should not render the form if no anchor is initially present', () => {
    const activityDirective: ActivityDirective = activityDirectivesMap[12];

    const { getByRole } = render(ActivityAnchorForm, {
      activityDirective,
      activityDirectivesMap,
      anchorId: activityDirective.anchor_id,
      isAnchoredToStart: activityDirective.anchored_to_start,
      startOffset: activityDirective.start_offset,
    });
    expect(getByRole('group').getElementsByClassName('content')[0].getAttribute('aria-hidden')).toEqual('true');
  });

  it('Should render the form when an anchor is initially present', () => {
    const activityDirective: ActivityDirective = activityDirectivesMap[13];

    const { getByRole } = render(ActivityAnchorForm, {
      activityDirective,
      activityDirectivesMap,
      anchorId: activityDirective.anchor_id,
      isAnchoredToStart: activityDirective.anchored_to_start,
      startOffset: activityDirective.start_offset,
    });

    expect(getByRole('group').getElementsByClassName('content')[0].getAttribute('aria-hidden')).toEqual('false');
  });
});
