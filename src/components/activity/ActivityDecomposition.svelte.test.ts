import { cleanup, getByText, render } from '@testing-library/svelte';
import { keyBy } from 'lodash-es';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { activitiesMap } from '../../stores/activities';
import ActivityDecomposition from './ActivityDecomposition.svelte';

const activities: Activity[] = [
  {
    arguments: {},
    attributes: {
      arguments: {},
      computedAttributes: {},
    },
    child_ids: [70, 72],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '84 days',
    id: 12,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'parent 1',
    parent_id: null,
    simulated_activity_id: 29,
    simulation_dataset_id: 6,
    source_scheduling_goal_id: null,
    start_time: '2022-062T10:00:00.000',
    tags: [],
    type: 'parent',
    unfinished: false,
  },
  {
    arguments: {},
    attributes: {
      arguments: {
        counter: 1,
      },
      computedAttributes: {},
    },
    child_ids: [],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '6 days',
    id: 68,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'grandchild1 1',
    parent_id: 72,
    simulated_activity_id: 68,
    simulation_dataset_id: 21,
    source_scheduling_goal_id: null,
    start_time: '2020-129T03:38:49.856',
    tags: [],
    type: 'grandchild1',
    unfinished: false,
  },
  {
    arguments: {},
    attributes: {
      arguments: {
        counter: 1,
      },
      computedAttributes: {},
    },
    child_ids: [],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '6 days',
    id: 69,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'grandchild2 1',
    parent_id: 70,
    simulated_activity_id: 69,
    simulation_dataset_id: 21,
    source_scheduling_goal_id: null,
    start_time: '2020-072T03:38:49.856',
    tags: [],
    type: 'grandchild2',
    unfinished: false,
  },
  {
    arguments: {},
    attributes: {
      arguments: {
        counter: 1,
      },
      computedAttributes: {},
    },
    child_ids: [69, 71],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '27 days',
    id: 70,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'child1 1',
    parent_id: 12,
    simulated_activity_id: 70,
    simulation_dataset_id: 21,
    source_scheduling_goal_id: null,
    start_time: '2020-072T03:38:49.856',
    tags: [],
    type: 'child1',
    unfinished: false,
  },
  {
    arguments: {},
    attributes: {
      arguments: {
        counter: 2,
      },
      computedAttributes: {},
    },
    child_ids: [],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '6 days',
    id: 71,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'grandchild3 1',
    parent_id: 70,
    simulated_activity_id: 71,
    simulation_dataset_id: 21,
    source_scheduling_goal_id: null,
    start_time: '2020-093T03:38:49.856',
    tags: [],
    type: 'grandchild3',
    unfinished: false,
  },
  {
    arguments: {},
    attributes: {
      arguments: {
        counter: 2,
      },
      computedAttributes: {},
    },
    child_ids: [68, 73],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '27 days',
    id: 72,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'child2 1',
    parent_id: 12,
    simulated_activity_id: 72,
    simulation_dataset_id: 21,
    source_scheduling_goal_id: null,
    start_time: '2020-129T03:38:49.856',
    tags: [],
    type: 'child2',
    unfinished: false,
  },
  {
    arguments: {},
    attributes: {
      arguments: {
        counter: 2,
      },
      computedAttributes: {},
    },
    child_ids: [],
    created_at: '2022-08-03T18:21:51.954599+00:00',
    duration: '6 days',
    id: 73,
    last_modified_at: '2022-08-03T21:53:22.093235+00:00',
    metadata: {},
    name: 'grandchild4 1',
    parent_id: 72,
    simulated_activity_id: 73,
    simulation_dataset_id: 21,
    source_scheduling_goal_id: null,
    start_time: '2020-150T03:38:49.856',
    tags: [],
    type: 'grandchild4',
    unfinished: false,
  },
];

describe('Activity Decomposition component', () => {
  beforeAll(() => {
    activitiesMap.set(keyBy(activities, 'id'));
  });

  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    activitiesMap.set({});
  });

  it('Should render the Activity Decomposition component', () => {
    const { container, getByText } = render(ActivityDecomposition, { id: 12, selected_id: 12 });
    const activityDecomposition = container.getElementsByClassName('activity-decomposition');

    // There should be as many activity decomposition components as there are activities
    expect(activityDecomposition.length).toEqual(activities.length);

    // Ensure each activity type is represented in the tree
    activities.forEach(activity => expect(getByText(activity.type)).to.exist);
  });

  it('Should highlight the selected root activity', () => {
    const { container } = render(ActivityDecomposition, { id: 12, selected_id: 12 });
    const selectedActivity = container.getElementsByClassName('activity-decomposition-selected');

    // There should be one node selected
    expect(selectedActivity.length).toEqual(1);

    // The node should have the text of the selected activity
    expect(selectedActivity[0].textContent).toEqual('parent');
  });

  it('Should highlight the selected child activity', () => {
    const { container } = render(ActivityDecomposition, { id: 12, selected_id: 69 });
    const selectedActivity = container.getElementsByClassName('activity-decomposition-selected');

    // There should be one node selected
    expect(selectedActivity.length).toEqual(1);

    // The node should have the text of the selected activity
    expect(selectedActivity[0].textContent).toEqual('grandchild2');
  });

  it('Should handle activity not found in store', () => {
    const { getByRole, container } = render(ActivityDecomposition, { id: 999, selected_id: 12 });

    // Should only see the root since it has a bad ID and should not render children
    expect(getByRole('tree')).to.exist;

    // Should see a message warning about the missing activity
    expect(getByText(container, `Activity ${999} not found`)).to.exist;
  });
});
