import { cleanup, getByText, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { SpansMap, SpanUtilityMaps } from '../../types/simulation';
import ActivityDecomposition from './ActivityDecomposition.svelte';

const spanUtilityMaps: SpanUtilityMaps = {
  directiveIdToSpanIdMap: {},
  spanIdToChildIdsMap: {
    12: [70, 72],
    68: [],
    69: [],
    70: [69, 71],
    71: [],
    72: [68, 73],
    73: [],
  },
  spanIdToDirectiveIdMap: {},
};

const spansMap: SpansMap = {
  12: {
    attributes: {
      arguments: {},
      computedAttributes: {},
    },
    dataset_id: 1,
    duration: '84 days',
    id: 12,
    parent_id: null,
    start_offset: '00:00:00',
    type: 'parent',
  },
  68: {
    attributes: {
      arguments: {
        counter: 1,
      },
      computedAttributes: {},
    },
    dataset_id: 1,
    duration: '6 days',
    id: 68,
    parent_id: 72,
    start_offset: '00:00:00',
    type: 'grandchild1',
  },
  69: {
    attributes: {
      arguments: {
        counter: 1,
      },
      computedAttributes: {},
    },
    dataset_id: 1,
    duration: '6 days',
    id: 69,
    parent_id: 70,
    start_offset: '00:00:00',
    type: 'grandchild2',
  },
  70: {
    attributes: {
      arguments: {
        counter: 1,
      },
      computedAttributes: {},
    },
    dataset_id: 1,
    duration: '27 days',
    id: 70,
    parent_id: 12,
    start_offset: '00:00:00',
    type: 'child1',
  },
  71: {
    attributes: {
      arguments: {
        counter: 2,
      },
      computedAttributes: {},
    },
    dataset_id: 1,
    duration: '6 days',
    id: 71,
    parent_id: 70,
    start_offset: '00:00:00',
    type: 'grandchild3',
  },
  72: {
    attributes: {
      arguments: {
        counter: 2,
      },
      computedAttributes: {},
    },
    dataset_id: 1,
    duration: '27 days',
    id: 72,
    parent_id: 12,
    start_offset: '00:00:00',
    type: 'child2',
  },
  73: {
    attributes: {
      arguments: {
        counter: 2,
      },
      computedAttributes: {},
    },
    dataset_id: 1,
    duration: '6 days',
    id: 73,
    parent_id: 72,
    start_offset: '00:00:00',
    type: 'grandchild4',
  },
};

describe('Activity Decomposition component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render the Activity Decomposition component', () => {
    const { container, getByText } = render(ActivityDecomposition, {
      rootSpanId: 12,
      selectedSpanId: 12,
      spanUtilityMaps,
      spansMap,
    });
    const activityDecomposition = container.getElementsByClassName('activity-decomposition');
    const spansList = Object.values(spansMap);

    // There should be as many activity decomposition components as there are activities
    expect(activityDecomposition.length).toEqual(spansList.length);

    // Ensure each activity type is represented in the tree
    spansList.forEach(span => expect(getByText(span.type)).to.exist);
  });

  it('Should highlight the selected root activity', () => {
    const { container } = render(ActivityDecomposition, {
      rootSpanId: 12,
      selectedSpanId: 12,
      spanUtilityMaps,
      spansMap,
    });
    const selected = container.getElementsByClassName('activity-decomposition-selected');

    // There should be one node selected
    expect(selected.length).toEqual(1);

    // The node should have the text of the selected activity
    expect(selected[0].textContent).toEqual('parent');
  });

  it('Should highlight the selected child activity', () => {
    const { container } = render(ActivityDecomposition, {
      rootSpanId: 12,
      selectedSpanId: 69,
      spanUtilityMaps,
      spansMap,
    });
    const selected = container.getElementsByClassName('activity-decomposition-selected');

    // There should be one node selected
    expect(selected.length).toEqual(1);

    // The node should have the text of the selected activity
    expect(selected[0].textContent).toEqual('grandchild2');
  });

  it('Should handle activity not found in store', () => {
    const { getByRole, container } = render(ActivityDecomposition, {
      rootSpanId: 999,
      selectedSpanId: 12,
      spanUtilityMaps,
      spansMap,
    });

    // Should only see the root since it has a bad ID and should not render children
    expect(getByRole('tree')).to.exist;

    // Should see a message warning about the missing activity
    expect(getByText(container, `Activity not found`)).to.exist;
  });
});
