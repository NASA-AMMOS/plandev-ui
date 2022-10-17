import { cleanup, getByText, render } from '@testing-library/svelte';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { activitiesMap } from '../../stores/activities';
import ActivityDecomposition from './ActivityDecomposition.svelte';

const activities: ActivitiesMap = {
  directive_12: {
    arguments: {},
    attributes: {
      arguments: {},
      computedAttributes: {},
    },
    childUniqueIds: ['span_70', 'span_72'],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '84 days',
    id: 12,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'parent 1',
    parentUniqueId: null,
    parent_id: null,
    plan_id: 0,
    simulated_activity_id: 29,
    source_scheduling_goal_id: null,
    start_time_doy: '2022-062T10:00:00.000',
    tags: [],
    type: 'parent',
    unfinished: false,
    uniqueId: 'directive_12',
  },
  span_68: {
    arguments: {},
    attributes: {
      arguments: {
        counter: 1,
      },
      computedAttributes: {},
    },
    childUniqueIds: [],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '6 days',
    id: 68,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'grandchild1 1',
    parentUniqueId: 'span_72',
    parent_id: 72,
    plan_id: 0,
    simulated_activity_id: 68,
    source_scheduling_goal_id: null,
    start_time_doy: '2020-129T03:38:49.856',
    tags: [],
    type: 'grandchild1',
    unfinished: false,
    uniqueId: 'span_68',
  },
  span_69: {
    arguments: {},
    attributes: {
      arguments: {
        counter: 1,
      },
      computedAttributes: {},
    },
    childUniqueIds: [],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '6 days',
    id: 69,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'grandchild2 1',
    parentUniqueId: 'span_70',
    parent_id: 70,
    plan_id: 0,
    simulated_activity_id: 69,
    source_scheduling_goal_id: null,
    start_time_doy: '2020-072T03:38:49.856',
    tags: [],
    type: 'grandchild2',
    unfinished: false,
    uniqueId: 'span_69',
  },
  span_70: {
    arguments: {},
    attributes: {
      arguments: {
        counter: 1,
      },
      computedAttributes: {},
    },
    childUniqueIds: ['span_69', 'span_71'],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '27 days',
    id: 70,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'child1 1',
    parentUniqueId: 'directive_12',
    parent_id: 12,
    plan_id: 0,
    simulated_activity_id: 70,
    source_scheduling_goal_id: null,
    start_time_doy: '2020-072T03:38:49.856',
    tags: [],
    type: 'child1',
    unfinished: false,
    uniqueId: 'span_70',
  },
  span_71: {
    arguments: {},
    attributes: {
      arguments: {
        counter: 2,
      },
      computedAttributes: {},
    },
    childUniqueIds: [],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '6 days',
    id: 71,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'grandchild3 1',
    parentUniqueId: 'span_70',
    parent_id: 70,
    plan_id: 0,
    simulated_activity_id: 71,
    source_scheduling_goal_id: null,
    start_time_doy: '2020-093T03:38:49.856',
    tags: [],
    type: 'grandchild3',
    unfinished: false,
    uniqueId: 'span_71',
  },
  span_72: {
    arguments: {},
    attributes: {
      arguments: {
        counter: 2,
      },
      computedAttributes: {},
    },
    childUniqueIds: ['span_68', 'span_73'],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '27 days',
    id: 72,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'child2 1',
    parentUniqueId: 'directive_12',
    parent_id: 12,
    plan_id: 0,
    simulated_activity_id: 72,
    source_scheduling_goal_id: null,
    start_time_doy: '2020-129T03:38:49.856',
    tags: [],
    type: 'child2',
    unfinished: false,
    uniqueId: 'span_72',
  },
  span_73: {
    arguments: {},
    attributes: {
      arguments: {
        counter: 2,
      },
      computedAttributes: {},
    },
    childUniqueIds: [],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '6 days',
    id: 73,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'grandchild4 1',
    parentUniqueId: 'directive_72',
    parent_id: 72,
    plan_id: 0,
    simulated_activity_id: 73,
    source_scheduling_goal_id: null,
    start_time_doy: '2020-150T03:38:49.856',
    tags: [],
    type: 'grandchild4',
    unfinished: false,
    uniqueId: 'span_73',
  },
};

describe('Activity Decomposition component', () => {
  beforeAll(() => {
    // See: https://github.com/sveltejs/kit/issues/6259
    vi.mock('$app/environment', () => ({ browser: 'window' in globalThis }));
    activitiesMap.set(activities);
  });

  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    activitiesMap.set({});
  });

  it('Should render the Activity Decomposition component', () => {
    const { container, getByText } = render(ActivityDecomposition, {
      rootUniqueId: 'directive_12',
      selectedUniqueId: 'directive_12',
    });
    const activityDecomposition = container.getElementsByClassName('activity-decomposition');
    const activitiesList = Object.values(activities);

    // There should be as many activity decomposition components as there are activities
    expect(activityDecomposition.length).toEqual(activitiesList.length);

    // Ensure each activity type is represented in the tree
    activitiesList.forEach(activity => expect(getByText(activity.type)).to.exist);
  });

  it('Should highlight the selected root activity', () => {
    const { container } = render(ActivityDecomposition, {
      rootUniqueId: 'directive_12',
      selectedUniqueId: 'directive_12',
    });
    const selectedActivity = container.getElementsByClassName('activity-decomposition-selected');

    // There should be one node selected
    expect(selectedActivity.length).toEqual(1);

    // The node should have the text of the selected activity
    expect(selectedActivity[0].textContent).toEqual('parent');
  });

  it('Should highlight the selected child activity', () => {
    const { container } = render(ActivityDecomposition, {
      rootUniqueId: 'directive_12',
      selectedUniqueId: 'span_69',
    });
    const selectedActivity = container.getElementsByClassName('activity-decomposition-selected');

    // There should be one node selected
    expect(selectedActivity.length).toEqual(1);

    // The node should have the text of the selected activity
    expect(selectedActivity[0].textContent).toEqual('grandchild2');
  });

  it('Should handle activity not found in store', () => {
    const { getByRole, container } = render(ActivityDecomposition, {
      rootUniqueId: 'directive_999',
      selectedUniqueId: 'span_12',
    });

    // Should only see the root since it has a bad ID and should not render children
    expect(getByRole('tree')).to.exist;

    // Should see a message warning about the missing activity
    expect(getByText(container, `Activity not found`)).to.exist;
  });
});
