import { keyBy } from 'lodash-es';
import { describe, expect, test } from 'vitest';
import {
  ViewDiscreteLayerColorPresets,
  ViewLineLayerColorPresets,
  ViewXRangeLayerSchemePresets,
} from '../constants/view';
import type { ActivityDirective, ActivityType } from '../types/activity';
import type { ExternalEvent } from '../types/external-event';
import type { DefaultEffectiveArgumentsMap } from '../types/parameter';
import type { Resource, ResourceType, ResourceValue, Span, SpanUtilityMaps, SpansMap } from '../types/simulation';
import type { Tag } from '../types/tags';
import type { Axis, DiscreteTreeNode, Layer, TimeRange, Timeline, XRangeLayer } from '../types/timeline';
import { createSpanUtilityMaps } from './activities';
import { convertUTCToMs } from './time';
import {
  applyActivityLayerFilter,
  createHorizontalGuide,
  createRow,
  createTimeline,
  createTimelineActivityLayer,
  createTimelineExternalEventLayer,
  createTimelineLineLayer,
  createTimelineXRangeLayer,
  createVerticalGuide,
  createYAxis,
  directiveInView,
  duplicateRow,
  externalEventInView,
  generateDiscreteTreeUtil,
  getMatchingTypesForActivityLayerFilter,
  getResourceForLayer,
  getTimeRangeAroundTime,
  getUniqueColorForActivityLayer,
  getUniqueColorForLineLayer,
  getUniqueColorSchemeForXRangeLayer,
  getYAxisBounds,
  isActivityLayer,
  isExternalEventLayer,
  isLineLayer,
  isSortedByX,
  isXRangeLayer,
  lowerBoundByX,
  matchesDynamicFilter,
  paginateNodes,
  spanInView,
  upperBoundByX,
} from './timeline';

const testActivityTypes: ActivityType[] = [
  {
    computed_attributes_value_schema: {
      items: {},
      type: 'struct',
    },
    description: '',
    name: 'child',
    parameters: {
      counter: {
        order: 0,
        schema: {
          type: 'int',
        },
      },
    },
    required_parameters: [],
    subsystem_tag: null,
  },
  {
    computed_attributes_value_schema: {
      items: {},
      type: 'struct',
    },
    description: '',
    name: 'parent',
    parameters: {
      label: {
        order: 0,
        schema: {
          type: 'string',
        },
      },
    },
    required_parameters: [],
    subsystem_tag: {
      color: '#FFFFFF',
      created_at: '2022-08-03T18:21:51',
      id: 1,
      name: 'subsystem1',
      owner: 'user1',
    },
  },
  {
    computed_attributes_value_schema: {
      items: {
        biteSizeWasBig: {
          type: 'boolean',
        },
        newFlag: {
          type: 'variant',
          variants: [
            {
              key: 'A',
              label: 'A',
            },
            {
              key: 'B',
              label: 'B',
            },
          ],
        },
      },
      type: 'struct',
    },
    description: '',
    name: 'BiteBanana',
    parameters: {
      biteSize: {
        order: 0,
        schema: {
          metadata: {
            banannotation: {
              value: 'Specifies the size of bite to take',
            },
            unit: {
              value: 'm',
            },
          },
          type: 'real',
        },
      },
    },
    required_parameters: [],
    subsystem_tag: null,
  },
  {
    computed_attributes_value_schema: {
      type: 'int',
    },
    description: '',
    name: 'BakeBananaBread',
    parameters: {
      glutenFree: {
        order: 2,
        schema: {
          type: 'boolean',
        },
      },
      tbSugar: {
        order: 1,
        schema: {
          type: 'int',
        },
      },
      temperature: {
        order: 0,
        schema: {
          type: 'real',
        },
      },
    },
    required_parameters: ['tbSugar', 'glutenFree'],
    subsystem_tag: null,
  },
];

const testDefaultArgumentsMap: DefaultEffectiveArgumentsMap = {
  BakeBananaBread: { temperature: 350 },
  BiteBanana: { biteSize: 1 },
  child: { counter: 0 },
  parent: { label: 'unlabeled' },
};

const testSpans: Span[] = [
  generateSpan({
    duration: '03:00:00',
    durationMs: 10800000,
    endMs: 1,
    parent_id: 1,
    span_id: 2,
    startMs: 0,
    start_offset: '00:10:00',
    type: 'child',
  }),
  generateSpan({
    duration: '02:00:00',
    durationMs: 7200000,
    endMs: 1,
    parent_id: null,
    span_id: 1,
    startMs: 0,
    start_offset: '00:00:00',
    type: 'parent',
  }),
  generateSpan({
    duration: '04:00:00',
    durationMs: 14400000,
    endMs: 1,
    parent_id: 1,
    span_id: 3,
    startMs: 0,
    start_offset: '00:05:00',
    type: 'child',
  }),
  generateSpan({
    attributes: {
      arguments: {},
      computedAttributes: {},
      directiveId: 1,
    },
    duration: '04:00:00',
    durationMs: 14400000,
    endMs: 1,
    parent_id: null,
    span_id: 4,
    startMs: 0,
    start_offset: '00:05:00',
    type: 'BiteBanana',
  }),
  generateSpan({
    attributes: {
      arguments: {},
      computedAttributes: {},
      directiveId: 2,
    },
    duration: '04:00:00',
    durationMs: 14400000,
    endMs: 1,
    parent_id: null,
    span_id: 5,
    startMs: 0,
    start_offset: '00:05:00',
    type: 'BiteBanana',
  }),
];
const testDirectives: ActivityDirective[] = [
  generateActivityDirective({
    id: 1,
    name: 'Bar',
    start_offset: '00:10:00',
    start_time_ms: 0,
    type: 'BiteBanana',
  }),
  generateActivityDirective({
    id: 2,
    name: 'Charlie',
    start_offset: '00:10:00',
    start_time_ms: 0,
    type: 'BiteBanana',
  }),
];

const testExternalEvents: ExternalEvent[] = [generateExternalEvent({})];

const testSpansMap: SpansMap = keyBy(testSpans, 'span_id');
const testSpansUtilityMap: SpanUtilityMaps = createSpanUtilityMaps(testSpans);

function generateTimelines() {
  // Create test timelines
  const timeline1 = createTimeline([]);
  const timeline2 = createTimeline([timeline1]);
  return [timeline1, timeline2];
}

function populateTimelineRows(timelines: Timeline[]) {
  timelines.forEach(timeline => {
    timeline.rows.push(createRow(timelines));
    timeline.rows.push(createRow(timelines));
  });
}

function populateTimelineVerticalGuides(timelines: Timeline[]) {
  timelines.forEach(timeline => {
    timeline.verticalGuides.push(createVerticalGuide(timelines, ''));
    timeline.verticalGuides.push(createVerticalGuide(timelines, ''));
  });
}

function populateTimelineLayers(timelines: Timeline[]) {
  timelines.forEach(timeline => {
    timeline.rows.forEach(row => {
      row.layers.push(createTimelineActivityLayer(timelines));
      row.layers.push(createTimelineLineLayer(timelines, row.yAxes));
      row.layers.push(createTimelineXRangeLayer(timelines, row.yAxes));
      row.layers.push(createTimelineExternalEventLayer(timelines));
    });
  });
  return timelines;
}

function populateTimelineHorizontalGuides(timelines: Timeline[]) {
  timelines.forEach(timeline => {
    timeline.rows.forEach(row => {
      row.horizontalGuides.push(createHorizontalGuide(timelines, row.yAxes));
      row.horizontalGuides.push(createHorizontalGuide(timelines, row.yAxes));
    });
  });
  return timelines;
}

function populateTimelineYAxes(timelines: Timeline[]) {
  timelines.forEach(timeline => {
    timeline.rows.forEach(row => {
      row.yAxes.push(createYAxis(timelines));
    });
  });
  return timelines;
}

function generateActivityDirective(properties: Partial<ActivityDirective>): ActivityDirective {
  return {
    anchor_id: 0,
    anchored_to_start: true,
    arguments: {},
    created_at: '',
    created_by: 'foo',
    id: 1,
    last_modified_arguments_at: '',
    last_modified_at: '',
    metadata: {},
    name: '',
    plan_id: 1,
    source_scheduling_goal_id: null,
    source_scheduling_goal_invocation_id: null,
    start_offset: '0',
    start_time_ms: 0,
    tags: [],
    type: 'BiteBanana',
    ...properties,
  };
}

function generateTag(properties: Partial<Tag>): Tag {
  return { color: '#FFFFFF', created_at: '', id: -1, name: '', owner: '', ...properties };
}

function generateSpan(properties: Partial<Span>): Span {
  return {
    attributes: { arguments: {}, computedAttributes: {} },
    dataset_id: 1,
    duration: '',
    durationMs: 1,
    endMs: 1,
    parent_id: null,
    span_id: 1,
    startMs: 0,
    start_offset: '',
    type: 'foo',
    ...properties,
  };
}

function generateExternalEvent(properties: Partial<ExternalEvent>): ExternalEvent {
  return {
    attributes: {},
    duration: '',
    duration_ms: 0,
    pkey: {
      derivation_group_name: 'test_derivation_group',
      event_type_name: 'test_event_type',
      key: 'test_event',
      source_key: 'test_source',
    },
    source: undefined,
    start_ms: 0,
    start_time: '',
    ...properties,
  };
}

test('createTimeline', () => {
  const timelines = generateTimelines();
  expect(timelines[0].id).toBe(0);
  expect(timelines[1].id).toBe(1);
});

test('createRow', () => {
  const timelines = generateTimelines();
  populateTimelineRows(timelines);

  // Check length
  expect(timelines[0].rows.length).toBe(2);
  expect(timelines[1].rows.length).toBe(2);

  // Check IDs
  expect(timelines[0].rows[0].id).toBe(0);
  expect(timelines[0].rows[1].id).toBe(1);
  expect(timelines[1].rows[0].id).toBe(2);
  expect(timelines[1].rows[1].id).toBe(3);
});

test('createTimelineLayers', () => {
  const timelines = generateTimelines();
  populateTimelineRows(timelines);
  populateTimelineYAxes(timelines);
  populateTimelineLayers(timelines);

  // Check IDs
  expect(timelines[0].rows[0].layers[0].chartType).toBe('activity');
  expect(timelines[0].rows[0].layers[0].id).toBe(0);
  expect(timelines[0].rows[0].layers[0].yAxisId).toBe(null);
  expect(timelines[0].rows[0].layers[1].chartType).toBe('line');
  expect(timelines[0].rows[0].layers[1].id).toBe(1);
  expect(timelines[0].rows[0].layers[1].yAxisId).toBe(0);
  expect(timelines[0].rows[0].layers[2].chartType).toBe('x-range');
  expect(timelines[0].rows[0].layers[2].id).toBe(2);
  expect(timelines[0].rows[0].layers[2].yAxisId).toBe(0);
  expect(timelines[0].rows[0].layers[3].chartType).toBe('externalEvent');
  expect(timelines[0].rows[0].layers[3].id).toBe(3);
  expect(timelines[0].rows[0].layers[3].yAxisId).toBe(null);

  expect(timelines[1].rows[0].layers[0].chartType).toBe('activity');
  expect(timelines[1].rows[0].layers[0].id).toBe(8);
  expect(timelines[1].rows[0].layers[0].yAxisId).toBe(null);
  expect(timelines[1].rows[0].layers[1].chartType).toBe('line');
  expect(timelines[1].rows[0].layers[1].id).toBe(9);
  expect(timelines[1].rows[0].layers[1].yAxisId).toBe(2);
  expect(timelines[1].rows[0].layers[2].chartType).toBe('x-range');
  expect(timelines[1].rows[0].layers[2].id).toBe(10);
  expect(timelines[1].rows[0].layers[2].yAxisId).toBe(2);
  expect(timelines[1].rows[0].layers[3].chartType).toBe('externalEvent');
  expect(timelines[1].rows[0].layers[3].id).toBe(11);
  expect(timelines[1].rows[0].layers[3].yAxisId).toBe(null);
});

test('createTimelineHorizontalGuides', () => {
  const timelines = generateTimelines();
  populateTimelineRows(timelines);
  populateTimelineYAxes(timelines);
  populateTimelineHorizontalGuides(timelines);

  // Check IDs
  expect(timelines[0].rows[0].horizontalGuides[0].id).toBe(0);
  expect(timelines[0].rows[1].horizontalGuides[0].id).toBe(2);
});

test('createVerticalGuide', () => {
  const timelines = generateTimelines();
  populateTimelineVerticalGuides(timelines);

  // Check IDs
  expect(timelines[0].verticalGuides[0].id).toBe(0);
  expect(timelines[1].verticalGuides[0].id).toBe(2);
});

test('getYAxisBounds', () => {
  const timelines = generateTimelines();
  populateTimelineRows(timelines);
  populateTimelineYAxes(timelines);
  populateTimelineLayers(timelines);

  const layer1 = timelines[0].rows[0].layers[1];
  const layer2 = timelines[0].rows[0].layers[2];
  layer1.filter.resource = 'resourceWithValues';
  layer2.filter.resource = 'resourceWithNoValues';
  const yAxis = timelines[0].rows[0].yAxes[0];
  const layers = timelines[0].rows[0].layers;
  const resourceWithValues: Resource = {
    name: 'resourceWithValues',
    schema: {
      items: { initial: { type: 'real' }, rate: { type: 'real' } },
      type: 'struct',
    },
    values: [
      { x: 1, y: 10 },
      { x: 2, y: 11 },
      { x: 3, y: 12 },
      { x: 4, y: 13 },
      { x: 5, y: 14 },
      { x: 6, y: 15 },
    ],
  };
  const resourceWithNoValues: Resource = {
    name: 'resourceWithNoValues',
    schema: {
      items: { initial: { type: 'real' }, rate: { type: 'real' } },
      type: 'struct',
    },
    values: [],
  };
  const resources: Resource[] = [resourceWithValues, resourceWithNoValues];
  expect(getYAxisBounds(yAxis, [], [])).toEqual([]);
  expect(getYAxisBounds(yAxis, layers, [])).toEqual([]);
  expect(getYAxisBounds(yAxis, layers, resources)).toEqual([10, 15]);
  expect(getYAxisBounds(yAxis, layers, [resourceWithNoValues])).toEqual([]);
  expect(
    getYAxisBounds({ ...yAxis, domainFitMode: 'manual', scaleDomain: [0, 10] }, layers, [resourceWithNoValues]),
  ).toEqual([0, 10]);
  expect(getYAxisBounds(yAxis, layers, resources, { end: 4, start: 3 })).toEqual([11, 14]);
  expect(getYAxisBounds({ ...yAxis, domainFitMode: 'fitPlan' }, layers, resources, { end: 4, start: 3 })).toEqual([
    10, 15,
  ]);
});

test('duplicateRow', () => {
  const timelines = generateTimelines();
  populateTimelineRows(timelines);
  populateTimelineYAxes(timelines);
  populateTimelineLayers(timelines);

  const firstRow = timelines[0].rows[0];
  const duplicatedRow = duplicateRow(firstRow, timelines, timelines[0].id);
  expect(duplicatedRow).to.not.be.null;
  if (duplicatedRow && timelines && timelines[0].rows) {
    const lastTimeline = timelines.at(-1);
    if (lastTimeline) {
      const lastRow = lastTimeline.rows.at(-1);
      if (lastRow) {
        expect(duplicatedRow.id).toEqual(lastRow.id + 1);
        expect(duplicatedRow.layers.length).toEqual(firstRow.layers.length);
        expect(duplicatedRow.horizontalGuides.length).toEqual(firstRow.horizontalGuides.length);
        expect(duplicatedRow.yAxes.length).toEqual(firstRow.yAxes.length);
        expect(duplicatedRow.name).toEqual(`${firstRow.name} (copy)`);
      }
    }
  }
});

test('getResourceForLayer', () => {
  const resourceA: ResourceType = {
    name: 'resourceA',
    schema: {
      items: { initial: { type: 'real' }, rate: { type: 'real' } },
      metadata: {
        description: { value: 'This is resource A' },
      },
      type: 'struct',
    },
  };
  const resourceB: ResourceType = {
    name: 'resourceB',
    schema: {
      items: { initial: { type: 'real' }, rate: { type: 'real' } },
      metadata: {
        description: { value: 'This is resource B' },
      },
      type: 'struct',
    },
  };
  const layer = createTimelineLineLayer([], []);
  expect(getResourceForLayer(layer, [resourceA, resourceB])).to.deep.equal(undefined);

  const layer2 = createTimelineLineLayer([], []);
  expect(getResourceForLayer(layer2, [])).to.deep.equal(undefined);

  const layer3 = createTimelineLineLayer([], []);
  layer3.filter.resource = 'resourceA';
  expect(getResourceForLayer(layer3, [resourceA, resourceB])).to.deep.equal(resourceA);
});

// TODO - should we make a test case for filtering the sources in an ExternalEventsLayer?

test('directiveInView', () => {
  const viewTimeRange: TimeRange = { end: 1716332383895 + 60000, start: 1716332383895 }; // One minute duration
  expect(directiveInView(generateActivityDirective({ start_time_ms: -1 }), viewTimeRange)).toBe(false);
  expect(directiveInView(generateActivityDirective({ start_time_ms: 1716332383894 }), viewTimeRange)).toBe(false);
  expect(directiveInView(generateActivityDirective({ start_time_ms: 1716332383895 }), viewTimeRange)).toBe(true);
  expect(directiveInView(generateActivityDirective({ start_time_ms: 1716332383896 }), viewTimeRange)).toBe(true);
  expect(directiveInView(generateActivityDirective({ start_time_ms: 1716332383895 + 60000 }), viewTimeRange)).toBe(
    false,
  );
  expect(directiveInView(generateActivityDirective({ start_time_ms: 1716332383895 + 60001 }), viewTimeRange)).toBe(
    false,
  );
});

test('spanInView', () => {
  const viewTimeRange: TimeRange = { end: 1716332383895 + 60000, start: 1716332383895 }; // One minute duration
  expect(spanInView(generateSpan({ durationMs: 1, endMs: 1, startMs: 0 }), viewTimeRange)).toBe(false);
  expect(spanInView(generateSpan({ durationMs: 3, endMs: 1716332383896, startMs: 1716332383893 }), viewTimeRange)).toBe(
    true,
  );
  expect(spanInView(generateSpan({ durationMs: 1, endMs: 1716332383896, startMs: 1716332383895 }), viewTimeRange)).toBe(
    true,
  );
  expect(spanInView(generateSpan({ durationMs: 1, endMs: 1716332383897, startMs: 1716332383896 }), viewTimeRange)).toBe(
    true,
  );
  expect(
    spanInView(
      generateSpan({ durationMs: 1, endMs: 1716332383895 + 60001, startMs: 1716332383895 + 60000 }),
      viewTimeRange,
    ),
  ).toBe(false);
  expect(spanInView(generateSpan({ durationMs: 1, endMs: 9716332383896, startMs: 9716332383895 }), viewTimeRange)).toBe(
    false,
  );
});

test('externalEventInView', () => {
  const viewTimeRange: TimeRange = { end: 1716332383895 + 60000, start: 1716332383895 }; // One minute duration
  expect(externalEventInView(generateExternalEvent({ duration_ms: 1, start_ms: 0 }), viewTimeRange)).toBe(false);
  expect(externalEventInView(generateExternalEvent({ duration_ms: 3, start_ms: 1716332383893 }), viewTimeRange)).toBe(
    true,
  );
  expect(externalEventInView(generateExternalEvent({ duration_ms: 1, start_ms: 1716332383895 }), viewTimeRange)).toBe(
    true,
  );
  expect(externalEventInView(generateExternalEvent({ duration_ms: 1, start_ms: 1716332383896 }), viewTimeRange)).toBe(
    true,
  );
  expect(externalEventInView(generateExternalEvent({ duration_ms: 1, start_ms: 9716332383895 }), viewTimeRange)).toBe(
    false,
  );
  expect(
    externalEventInView(generateExternalEvent({ duration_ms: 1, start_ms: 1716332383895 + 60000 }), viewTimeRange),
  ).toBe(false);
  expect(externalEventInView(generateExternalEvent({ duration_ms: 1, start_ms: 9716332383895 }), viewTimeRange)).toBe(
    false,
  );
});

test('isActivityLayer', () => {
  expect(isActivityLayer(createTimelineActivityLayer([]))).toBe(true);
  expect(isActivityLayer(createTimelineLineLayer([], []))).toBe(false);
  expect(isActivityLayer(createTimelineXRangeLayer([], []))).toBe(false);
  expect(isActivityLayer(createTimelineExternalEventLayer([]))).toBe(false);
});

test('isLineLayer', () => {
  expect(isLineLayer(createTimelineActivityLayer([]))).toBe(false);
  expect(isLineLayer(createTimelineLineLayer([], []))).toBe(true);
  expect(isLineLayer(createTimelineXRangeLayer([], []))).toBe(false);
  expect(isLineLayer(createTimelineExternalEventLayer([]))).toBe(false);
});

test('isXRangeLayer', () => {
  expect(isXRangeLayer(createTimelineActivityLayer([]))).toBe(false);
  expect(isXRangeLayer(createTimelineLineLayer([], []))).toBe(false);
  expect(isXRangeLayer(createTimelineXRangeLayer([], []))).toBe(true);
  expect(isXRangeLayer(createTimelineExternalEventLayer([]))).toBe(false);
});

test('isExternalEventLayer', () => {
  expect(isExternalEventLayer(createTimelineActivityLayer([]))).toBe(false);
  expect(isExternalEventLayer(createTimelineLineLayer([], []))).toBe(false);
  expect(isExternalEventLayer(createTimelineXRangeLayer([], []))).toBe(false);
  expect(isExternalEventLayer(createTimelineExternalEventLayer([]))).toBe(true);
});

test('paginateNodes', () => {
  const testNodes: DiscreteTreeNode[] = [];
  for (let i = 0; i < 1000; i++) {
    testNodes.push({
      activity_type: 'aggregation',
      children: [],
      expanded: false,
      id: 'foo',
      isLeaf: false,
      items: [],
      label: 'bar',
      type: 'Activity',
    });
  }
  expect(paginateNodes([], 'activity', '', {})).to.deep.eq([]);
  const paginatedNodes = paginateNodes(testNodes, 'activity', 'foo', { 'foo_[0 … 99]_page': true });
  expect(paginatedNodes).toHaveLength(10);
  expect(paginatedNodes[0].id).toBe('foo_[0 … 99]_page');
  expect(paginatedNodes[0].expanded).toBe(true);
  expect(paginatedNodes[9].id).toBe('foo_[900 … 999]_page');
});

test('generateDiscreteTree', () => {
  const time = Date.now();

  // empty
  expect(
    generateDiscreteTreeUtil(
      [],
      [],
      [],
      {},
      'flat',
      'event_type_name',
      false,
      testSpansUtilityMap,
      testSpansMap,
      false,
      false,
      {
        end: time + 10000,
        start: time,
      },
      false,
      false,
    ),
  ).to.deep.equal([]);

  // Directives, spans, and external events
  expect(
    generateDiscreteTreeUtil(
      testDirectives,
      testSpans,
      testExternalEvents,
      { BiteBanana: true, BiteBanana_1: true, parent: true, parent_1: true, parent_1_child: true },
      'flat',
      'event_type_name',
      false,
      testSpansUtilityMap,
      testSpansMap,
      true,
      true,
      {
        end: time + 10000,
        start: time,
      },
      true,
      true,
    ),
  ).to.deep.equal([
    {
      activity_type: undefined,
      children: [
        {
          activity_type: 'aggregation',
          children: [
            {
              activity_type: 'directive',
              children: [],
              expanded: true,
              id: 'BiteBanana_1',
              isLeaf: true,
              items: [
                {
                  directive: {
                    anchor_id: 0,
                    anchored_to_start: true,
                    arguments: {},
                    created_at: '',
                    created_by: 'foo',
                    id: 1,
                    last_modified_arguments_at: '',
                    last_modified_at: '',
                    metadata: {},
                    name: 'Bar',
                    plan_id: 1,
                    source_scheduling_goal_id: null,
                    source_scheduling_goal_invocation_id: null,
                    start_offset: '00:10:00',
                    start_time_ms: 0,
                    tags: [],
                    type: 'BiteBanana',
                  },
                  span: {
                    attributes: {
                      arguments: {},
                      computedAttributes: {},
                      directiveId: 1,
                    },
                    dataset_id: 1,
                    duration: '04:00:00',
                    durationMs: 14400000,
                    endMs: 1,
                    parent_id: null,
                    span_id: 4,
                    startMs: 0,
                    start_offset: '00:05:00',
                    type: 'BiteBanana',
                  },
                },
              ],
              label: 'Bar',
              type: 'Activity',
            },
            {
              activity_type: 'directive',
              children: [],
              expanded: false,
              id: 'BiteBanana_2',
              isLeaf: true,
              items: [
                {
                  directive: {
                    anchor_id: 0,
                    anchored_to_start: true,
                    arguments: {},
                    created_at: '',
                    created_by: 'foo',
                    id: 2,
                    last_modified_arguments_at: '',
                    last_modified_at: '',
                    metadata: {},
                    name: 'Charlie',
                    plan_id: 1,
                    source_scheduling_goal_id: null,
                    source_scheduling_goal_invocation_id: null,
                    start_offset: '00:10:00',
                    start_time_ms: 0,
                    tags: [],
                    type: 'BiteBanana',
                  },
                  span: {
                    attributes: {
                      arguments: {},
                      computedAttributes: {},
                      directiveId: 2,
                    },
                    dataset_id: 1,
                    duration: '04:00:00',
                    durationMs: 14400000,
                    endMs: 1,
                    parent_id: null,
                    span_id: 5,
                    startMs: 0,
                    start_offset: '00:05:00',
                    type: 'BiteBanana',
                  },
                },
              ],
              label: 'Charlie',
              type: 'Activity',
            },
          ],
          expanded: true,
          id: 'BiteBanana',
          isLeaf: false,
          items: [
            {
              directive: {
                anchor_id: 0,
                anchored_to_start: true,
                arguments: {},
                created_at: '',
                created_by: 'foo',
                id: 1,
                last_modified_arguments_at: '',
                last_modified_at: '',
                metadata: {},
                name: 'Bar',
                plan_id: 1,
                source_scheduling_goal_id: null,
                source_scheduling_goal_invocation_id: null,
                start_offset: '00:10:00',
                start_time_ms: 0,
                tags: [],
                type: 'BiteBanana',
              },
              span: {
                attributes: {
                  arguments: {},
                  computedAttributes: {},
                  directiveId: 1,
                },
                dataset_id: 1,
                duration: '04:00:00',
                durationMs: 14400000,
                endMs: 1,
                parent_id: null,
                span_id: 4,
                startMs: 0,
                start_offset: '00:05:00',
                type: 'BiteBanana',
              },
            },
            {
              directive: {
                anchor_id: 0,
                anchored_to_start: true,
                arguments: {},
                created_at: '',
                created_by: 'foo',
                id: 2,
                last_modified_arguments_at: '',
                last_modified_at: '',
                metadata: {},
                name: 'Charlie',
                plan_id: 1,
                source_scheduling_goal_id: null,
                source_scheduling_goal_invocation_id: null,
                start_offset: '00:10:00',
                start_time_ms: 0,
                tags: [],
                type: 'BiteBanana',
              },
              span: {
                attributes: {
                  arguments: {},
                  computedAttributes: {},
                  directiveId: 2,
                },
                dataset_id: 1,
                duration: '04:00:00',
                durationMs: 14400000,
                endMs: 1,
                parent_id: null,
                span_id: 5,
                startMs: 0,
                start_offset: '00:05:00',
                type: 'BiteBanana',
              },
            },
          ],
          label: 'BiteBanana',
          type: 'Activity',
        },
        {
          activity_type: 'aggregation',
          children: [],
          expanded: false,
          id: 'child',
          isLeaf: false,
          items: [
            {
              span: {
                attributes: {
                  arguments: {},
                  computedAttributes: {},
                },
                dataset_id: 1,
                duration: '03:00:00',
                durationMs: 10800000,
                endMs: 1,
                parent_id: 1,
                span_id: 2,
                startMs: 0,
                start_offset: '00:10:00',
                type: 'child',
              },
            },
            {
              span: {
                attributes: {
                  arguments: {},
                  computedAttributes: {},
                },
                dataset_id: 1,
                duration: '04:00:00',
                durationMs: 14400000,
                endMs: 1,
                parent_id: 1,
                span_id: 3,
                startMs: 0,
                start_offset: '00:05:00',
                type: 'child',
              },
            },
          ],
          label: 'child',
          type: 'Activity',
        },
        {
          activity_type: 'aggregation',
          children: [
            {
              activity_type: 'span',
              children: [
                {
                  activity_type: 'aggregation',
                  children: [
                    {
                      activity_type: 'span',
                      children: [],
                      expanded: false,
                      id: 'parent_1_child_2',
                      isLeaf: true,
                      items: [
                        {
                          span: {
                            attributes: {
                              arguments: {},
                              computedAttributes: {},
                            },
                            dataset_id: 1,
                            duration: '03:00:00',
                            durationMs: 10800000,
                            endMs: 1,
                            parent_id: 1,
                            span_id: 2,
                            startMs: 0,
                            start_offset: '00:10:00',
                            type: 'child',
                          },
                        },
                      ],
                      label: 'child',
                      type: 'Activity',
                    },
                    {
                      activity_type: 'span',
                      children: [],
                      expanded: false,
                      id: 'parent_1_child_3',
                      isLeaf: true,
                      items: [
                        {
                          span: {
                            attributes: {
                              arguments: {},
                              computedAttributes: {},
                            },
                            dataset_id: 1,
                            duration: '04:00:00',
                            durationMs: 14400000,
                            endMs: 1,
                            parent_id: 1,
                            span_id: 3,
                            startMs: 0,
                            start_offset: '00:05:00',
                            type: 'child',
                          },
                        },
                      ],
                      label: 'child',
                      type: 'Activity',
                    },
                  ],
                  expanded: true,
                  id: 'parent_1_child',
                  isLeaf: false,
                  items: [
                    {
                      span: {
                        attributes: {
                          arguments: {},
                          computedAttributes: {},
                        },
                        dataset_id: 1,
                        duration: '03:00:00',
                        durationMs: 10800000,
                        endMs: 1,
                        parent_id: 1,
                        span_id: 2,
                        startMs: 0,
                        start_offset: '00:10:00',
                        type: 'child',
                      },
                    },
                    {
                      span: {
                        attributes: {
                          arguments: {},
                          computedAttributes: {},
                        },
                        dataset_id: 1,
                        duration: '04:00:00',
                        durationMs: 14400000,
                        endMs: 1,
                        parent_id: 1,
                        span_id: 3,
                        startMs: 0,
                        start_offset: '00:05:00',
                        type: 'child',
                      },
                    },
                  ],
                  label: 'child',
                  type: 'Activity',
                },
              ],
              expanded: true,
              id: 'parent_1',
              isLeaf: false,
              items: [
                {
                  span: {
                    attributes: {
                      arguments: {},
                      computedAttributes: {},
                    },
                    dataset_id: 1,
                    duration: '02:00:00',
                    durationMs: 7200000,
                    endMs: 1,
                    parent_id: null,
                    span_id: 1,
                    startMs: 0,
                    start_offset: '00:00:00',
                    type: 'parent',
                  },
                },
              ],
              label: 'parent',
              type: 'Activity',
            },
          ],
          expanded: true,
          id: 'parent',
          isLeaf: false,
          items: [
            {
              span: {
                attributes: {
                  arguments: {},
                  computedAttributes: {},
                },
                dataset_id: 1,
                duration: '02:00:00',
                durationMs: 7200000,
                endMs: 1,
                parent_id: null,
                span_id: 1,
                startMs: 0,
                start_offset: '00:00:00',
                type: 'parent',
              },
            },
          ],
          label: 'parent',
          type: 'Activity',
        },
      ],
      expanded: false,
      id: '!!activity-agg',
      isLeaf: false,
      items: [
        {
          directive: {
            anchor_id: 0,
            anchored_to_start: true,
            arguments: {},
            created_at: '',
            created_by: 'foo',
            id: 1,
            last_modified_arguments_at: '',
            last_modified_at: '',
            metadata: {},
            name: 'Bar',
            plan_id: 1,
            source_scheduling_goal_id: null,
            source_scheduling_goal_invocation_id: null,
            start_offset: '00:10:00',
            start_time_ms: 0,
            tags: [],
            type: 'BiteBanana',
          },
          span: {
            attributes: {
              arguments: {},
              computedAttributes: {},
              directiveId: 1,
            },
            dataset_id: 1,
            duration: '04:00:00',
            durationMs: 14400000,
            endMs: 1,
            parent_id: null,
            span_id: 4,
            startMs: 0,
            start_offset: '00:05:00',
            type: 'BiteBanana',
          },
        },
        {
          directive: {
            anchor_id: 0,
            anchored_to_start: true,
            arguments: {},
            created_at: '',
            created_by: 'foo',
            id: 2,
            last_modified_arguments_at: '',
            last_modified_at: '',
            metadata: {},
            name: 'Charlie',
            plan_id: 1,
            source_scheduling_goal_id: null,
            source_scheduling_goal_invocation_id: null,
            start_offset: '00:10:00',
            start_time_ms: 0,
            tags: [],
            type: 'BiteBanana',
          },
          span: {
            attributes: {
              arguments: {},
              computedAttributes: {},
              directiveId: 2,
            },
            dataset_id: 1,
            duration: '04:00:00',
            durationMs: 14400000,
            endMs: 1,
            parent_id: null,
            span_id: 5,
            startMs: 0,
            start_offset: '00:05:00',
            type: 'BiteBanana',
          },
        },
        {
          span: {
            attributes: {
              arguments: {},
              computedAttributes: {},
            },
            dataset_id: 1,
            duration: '03:00:00',
            durationMs: 10800000,
            endMs: 1,
            parent_id: 1,
            span_id: 2,
            startMs: 0,
            start_offset: '00:10:00',
            type: 'child',
          },
        },
        {
          span: {
            attributes: {
              arguments: {},
              computedAttributes: {},
            },
            dataset_id: 1,
            duration: '04:00:00',
            durationMs: 14400000,
            endMs: 1,
            parent_id: 1,
            span_id: 3,
            startMs: 0,
            start_offset: '00:05:00',
            type: 'child',
          },
        },
        {
          span: {
            attributes: {
              arguments: {},
              computedAttributes: {},
            },
            dataset_id: 1,
            duration: '02:00:00',
            durationMs: 7200000,
            endMs: 1,
            parent_id: null,
            span_id: 1,
            startMs: 0,
            start_offset: '00:00:00',
            type: 'parent',
          },
        },
      ],
      label: 'Activities',
      type: 'Activity',
    },
    {
      activity_type: undefined,
      children: [
        {
          activity_type: undefined,
          children: [
            {
              activity_type: undefined,
              children: [],
              expanded: false,
              id: 'test_event',
              isLeaf: true,
              items: [
                {
                  externalEvent: {
                    attributes: {},
                    duration: '',
                    duration_ms: 0,
                    pkey: {
                      derivation_group_name: 'test_derivation_group',
                      event_type_name: 'test_event_type',
                      key: 'test_event',
                      source_key: 'test_source',
                    },
                    source: undefined,
                    start_ms: 0,
                    start_time: '',
                  },
                },
              ],
              label: 'test_event',
              type: 'ExternalEvent',
            },
          ],
          expanded: false,
          id: 'test_event_type',
          isLeaf: false,
          items: [
            {
              externalEvent: {
                attributes: {},
                duration: '',
                duration_ms: 0,
                pkey: {
                  derivation_group_name: 'test_derivation_group',
                  event_type_name: 'test_event_type',
                  key: 'test_event',
                  source_key: 'test_source',
                },
                source: undefined,
                start_ms: 0,
                start_time: '',
              },
            },
          ],
          label: 'test_event_type',
          type: 'ExternalEvent',
        },
      ],
      expanded: false,
      id: '!!ex-ev-agg',
      isLeaf: false,
      items: [
        {
          externalEvent: {
            attributes: {},
            duration: '',
            duration_ms: 0,
            pkey: {
              derivation_group_name: 'test_derivation_group',
              event_type_name: 'test_event_type',
              key: 'test_event',
              source_key: 'test_source',
            },
            source: undefined,
            start_ms: 0,
            start_time: '',
          },
        },
      ],
      label: 'External Events',
      type: 'ExternalEvent',
    },
  ]);
});

test('getUniqueColorForActivityLayer', () => {
  expect(getUniqueColorForActivityLayer(createRow([]))).toBe(ViewDiscreteLayerColorPresets[0]);
  const row2 = createRow([]);
  row2.layers = [createTimelineActivityLayer([])];
  expect(getUniqueColorForActivityLayer(row2)).toBe(ViewDiscreteLayerColorPresets[1]);
});

test('getUniqueColorForLineLayer', () => {
  expect(getUniqueColorForLineLayer(createRow([]))).toBe(ViewLineLayerColorPresets[0]);
  const row2 = createRow([]);
  row2.layers = [createTimelineLineLayer([], [])];
  expect(getUniqueColorForLineLayer(row2)).toBe(ViewLineLayerColorPresets[1]);
});

test('getUniqueColorSchemeForXRangeLayer', () => {
  expect(
    Object.keys(ViewXRangeLayerSchemePresets).indexOf(getUniqueColorSchemeForXRangeLayer(createRow([]))),
  ).toBeGreaterThan(-1);
  const row2 = createRow([]);
  row2.layers = [createTimelineXRangeLayer([], [])];
  const existingScheme = (row2.layers[0] as XRangeLayer).colorScheme;
  expect(getUniqueColorSchemeForXRangeLayer(row2)).not.toBe(existingScheme);
});

describe('getTimeRangeAroundTime', () => {
  const hourInMs = 3600000;
  const TEST_TIME = convertUTCToMs(`2024-10-14T16:06:00Z`);

  test('Should return TimeRange centered on time with +/- 1 day, unbounded', () => {
    const timeRange = getTimeRangeAroundTime(TEST_TIME, 48 * hourInMs);
    expect(timeRange).toStrictEqual({
      end: convertUTCToMs(`2024-10-15T16:06:00Z`), //1 day after TEST_TIME
      start: convertUTCToMs(`2024-10-13T16:06:00Z`), //1 day before TEST_TIME
    });
    expect(timeRange.end - timeRange.start).toBe(48 * hourInMs);
  });

  test('Should return TimeRange centered on time with +/- 1 hour, unbounded', () => {
    const timeRange = getTimeRangeAroundTime(TEST_TIME, 2 * hourInMs);
    expect(timeRange).toStrictEqual({
      end: convertUTCToMs(`2024-10-14T17:06:00Z`), //1 hour after TEST_TIME
      start: convertUTCToMs(`2024-10-14T15:06:00Z`), //1 hour before TEST_TIME
    });
    expect(timeRange.end - timeRange.start).toBe(2 * hourInMs);
  });

  test('Should return TimeRange with 48 hour span with time in it, bounded by the start', () => {
    const timeRange = getTimeRangeAroundTime(TEST_TIME, 48 * hourInMs, {
      end: convertUTCToMs(`2024-10-20T00:00:00Z`),
      start: convertUTCToMs(`2024-10-14T00:00:00Z`),
    });

    expect(timeRange).toStrictEqual({
      end: convertUTCToMs(`2024-10-16T00:00:00Z`), //bounded start + 48 hours
      start: convertUTCToMs(`2024-10-14T00:00:00Z`), //bounded start
    });
    expect(timeRange.end - timeRange.start).toBe(48 * hourInMs);
  });

  test('Should return TimeRange with 48 hour span with time in it, bounded by the end', () => {
    const timeRange = getTimeRangeAroundTime(TEST_TIME, 48 * hourInMs, {
      end: convertUTCToMs(`2024-10-14T11:59:59Z`),
      start: convertUTCToMs(`2024-10-10T00:00:00Z`),
    });
    expect(timeRange).toStrictEqual({
      end: convertUTCToMs(`2024-10-14T11:59:59Z`), //bounded end
      start: convertUTCToMs(`2024-10-12T11:59:59Z`), //bounded end - 48 hours
    });
    expect(timeRange.end - timeRange.start).toBe(48 * hourInMs);
  });
});

describe('applyActivityLayerFilter', () => {
  const tags: Tag[] = [generateTag({ id: 1 }), generateTag({ id: 2 })];
  const directives: ActivityDirective[] = [
    generateActivityDirective({ id: 1, name: 'Foo', source_scheduling_goal_id: 1, type: 'parent' }),
    generateActivityDirective({
      arguments: { newFlag: 'A' },
      id: 2,
      source_scheduling_goal_id: 2,
      tags: [{ tag: tags[1] }],
      type: 'BiteBanana',
    }),
    generateActivityDirective({ id: 3, tags: tags.map(tag => ({ tag })), type: 'PeelBanana' }),
    generateActivityDirective({ arguments: { newFlag: 'B' }, id: 4, type: 'BiteBanana' }),
  ];
  const spans: Span[] = [
    generateSpan({ parent_id: 1, span_id: 2, type: 'child' }),
    generateSpan({ parent_id: null, span_id: 1, type: 'parent' }),
    generateSpan({ parent_id: 1, span_id: 3, type: 'child' }),
    generateSpan({
      attributes: { arguments: { newFlag: 'A' }, computedAttributes: {} },
      parent_id: null,
      span_id: 4,
      type: 'BiteBanana',
    }),
    generateSpan({ parent_id: null, span_id: 5, type: 'PeelBanana' }),
    generateSpan({
      attributes: { arguments: { newFlag: 'B' }, computedAttributes: {} },
      parent_id: null,
      span_id: 6,
      type: 'BiteBanana',
    }),
  ];

  test('Should return all directives and spans if no filters applied', () => {
    expect(
      applyActivityLayerFilter(undefined, testDirectives, testSpans, testActivityTypes, testDefaultArgumentsMap),
    ).to.deep.eq({
      directives: testDirectives,
      spans: testSpans,
    });
    expect(
      applyActivityLayerFilter({}, testDirectives, testSpans, testActivityTypes, testDefaultArgumentsMap),
    ).to.deep.eq({
      directives: testDirectives,
      spans: testSpans,
    });
  });

  test('Should apply static type filters', () => {
    expect(
      applyActivityLayerFilter(
        { static_types: ['parent', 'BiteBanana'] },
        directives,
        spans,
        testActivityTypes,
        testDefaultArgumentsMap,
      ),
    ).to.deep.eq({
      directives: [directives[0], directives[1], directives[3]],
      spans: [spans[1], spans[3], spans[5]],
    });
  });

  test('Should apply dynamic type filters', () => {
    expect(
      applyActivityLayerFilter(
        {
          dynamic_type_filters: [
            {
              field: 'Type',
              id: 1,
              operator: 'includes',
              value: 'banana',
            },
          ],
        },
        directives,
        spans,
        testActivityTypes,
        testDefaultArgumentsMap,
      ),
    ).to.deep.eq({
      directives: [directives[1], directives[2], directives[3]],
      spans: [spans[3], spans[4], spans[5]],
    });

    expect(
      applyActivityLayerFilter(
        {
          dynamic_type_filters: [
            {
              field: 'Type',
              id: 1,
              operator: 'equals',
              value: 'BiteBanana',
            },
          ],
        },
        directives,
        spans,
        testActivityTypes,
        testDefaultArgumentsMap,
      ),
    ).to.deep.eq({
      directives: [directives[1], directives[3]],
      spans: [spans[3], spans[5]],
    });

    expect(
      applyActivityLayerFilter(
        {
          dynamic_type_filters: [
            {
              field: 'Subsystem',
              id: 1,
              operator: 'equals',
              value: 1,
            },
          ],
        },
        directives,
        spans,
        testActivityTypes,
        testDefaultArgumentsMap,
      ),
    ).to.deep.eq({
      directives: [directives[0]],
      spans: [spans[1]],
    });
  });

  test('Should apply other filters', () => {
    expect(
      applyActivityLayerFilter(
        {
          other_filters: [
            {
              field: 'Name',
              id: 1,
              operator: 'includes',
              value: 'oo',
            },
          ],
        },
        directives,
        spans,
        testActivityTypes,
        testDefaultArgumentsMap,
      ),
    ).to.deep.eq({
      directives: [directives[0]],
      spans: [],
    });

    expect(
      applyActivityLayerFilter(
        {
          other_filters: [
            {
              field: 'Parameter',
              id: 1,
              operator: 'equals',
              subfield: { name: 'newFlag', type: 'variant' },
              value: 'A',
            },
          ],
        },
        directives,
        spans,
        testActivityTypes,
        testDefaultArgumentsMap,
      ),
    ).to.deep.eq({
      directives: [directives[1]],
      spans: [spans[3]],
    });

    expect(
      applyActivityLayerFilter(
        {
          other_filters: [
            {
              field: 'SchedulingGoalId',
              id: 1,
              operator: 'equals',
              value: 1,
            },
          ],
        },
        directives,
        spans,
        testActivityTypes,
        testDefaultArgumentsMap,
      ),
    ).to.deep.eq({
      directives: [directives[0]],
      spans: [],
    });

    expect(
      applyActivityLayerFilter(
        {
          other_filters: [
            {
              field: 'Tags',
              id: 1,
              operator: 'includes',
              value: [1],
            },
          ],
        },
        directives,
        spans,
        testActivityTypes,
        testDefaultArgumentsMap,
      ),
    ).to.deep.eq({
      directives: [directives[2]],
      spans: [],
    });
  });
});

test('getMatchingTypesForActivityLayerFilter', () => {
  expect(getMatchingTypesForActivityLayerFilter({}, [])).to.deep.eq([]);
  expect(getMatchingTypesForActivityLayerFilter({}, testActivityTypes)).to.deep.eq(testActivityTypes);
  expect(
    getMatchingTypesForActivityLayerFilter({ static_types: ['parent', 'BiteBanana'] }, testActivityTypes),
  ).to.deep.eq([
    testActivityTypes.find(t => t.name === 'parent'),
    testActivityTypes.find(t => t.name === 'BiteBanana'),
  ]);
  expect(getMatchingTypesForActivityLayerFilter({ static_types: ['Foo'] }, testActivityTypes)).to.deep.eq([]);
  expect(
    getMatchingTypesForActivityLayerFilter(
      {
        dynamic_type_filters: [
          {
            field: 'Type',
            id: 1,
            operator: 'includes',
            value: 'banana',
          },
        ],
      },
      testActivityTypes,
    ),
  ).to.deep.eq(testActivityTypes.filter(t => t.name.toLowerCase().indexOf('banana') > -1));
});

test('matchesDynamicFilter', () => {
  expect(matchesDynamicFilter('Foo', 'equals', 'Foo')).toBeTruthy();
  expect(matchesDynamicFilter('Foo', 'does_not_equal', 'Bar')).toBeTruthy();
  expect(matchesDynamicFilter('Foo', 'includes', '')).toBeFalsy();
  expect(matchesDynamicFilter('Foo', 'includes', 'oo')).toBeTruthy();
  expect(matchesDynamicFilter([], 'includes', [1])).toBeFalsy();
  expect(matchesDynamicFilter([1, 2, 3], 'includes', [1])).toBeTruthy();
  expect(matchesDynamicFilter('Foo', 'does_not_include', '')).toBeTruthy();
  expect(matchesDynamicFilter('Foo', 'does_not_include', 'oo')).toBeFalsy();
  expect(matchesDynamicFilter([], 'does_not_include', [1])).toBeTruthy();
  expect(matchesDynamicFilter([1, 2, 3], 'does_not_include', [1])).toBeFalsy();
  expect(matchesDynamicFilter(2, 'is_greater_than', 1)).toBeTruthy();
  expect(matchesDynamicFilter('2', 'is_greater_than', '1')).toBeTruthy();
  expect(matchesDynamicFilter(2, 'is_less_than', 1)).toBeFalsy();
  expect(matchesDynamicFilter('2', 'is_less_than', '1')).toBeFalsy();
  expect(matchesDynamicFilter(2, 'is_within', [1, 3])).toBeTruthy();
  expect(matchesDynamicFilter(2, 'is_not_within', [1, 3])).toBeFalsy();
  // @ts-expect-error forcing the case where an invalid operator is specified
  expect(matchesDynamicFilter(2, 'is_definitely_somewhere_near', [1, 3])).toBeFalsy();
});

describe('in-view window search', () => {
  const at = (...xs: number[]) => xs.map(x => ({ x }));

  test('lowerBoundByX finds the first index with x >= target', () => {
    const points = at(10, 20, 20, 30, 40);
    expect(lowerBoundByX(points, 5)).toEqual(0);
    expect(lowerBoundByX(points, 10)).toEqual(0);
    expect(lowerBoundByX(points, 15)).toEqual(1);
    expect(lowerBoundByX(points, 20)).toEqual(1); // first of a duplicate run
    expect(lowerBoundByX(points, 40)).toEqual(4);
    expect(lowerBoundByX(points, 41)).toEqual(5); // past the end
    expect(lowerBoundByX([], 1)).toEqual(0);
  });

  test('upperBoundByX finds the first index with x > target', () => {
    const points = at(10, 20, 20, 30, 40);
    expect(upperBoundByX(points, 5)).toEqual(0);
    expect(upperBoundByX(points, 10)).toEqual(1);
    expect(upperBoundByX(points, 20)).toEqual(3); // past a duplicate run
    expect(upperBoundByX(points, 39)).toEqual(4);
    expect(upperBoundByX(points, 40)).toEqual(5);
    expect(upperBoundByX([], 1)).toEqual(0);
  });

  test('isSortedByX accepts non-decreasing and rejects any inversion', () => {
    expect(isSortedByX([])).toBe(true);
    expect(isSortedByX(at(1))).toBe(true);
    expect(isSortedByX(at(1, 1, 2, 2, 3))).toBe(true);
    expect(isSortedByX(at(1, 3, 2))).toBe(false);
    expect(isSortedByX(at(2, 1))).toBe(false);
  });

  /**
   * LayerLine replaced a full per-frame scan with binary search plus index arithmetic for the two
   * bounding off-screen points. This pins that arithmetic against the scan it replaced, including
   * the original's quirk of only assigning a bounding point once a preceding point had been seen.
   */
  test('bounded window matches the linear scan it replaced', () => {
    type P = { x: number };

    function linearScan(points: P[], start: number, end: number) {
      const inView: P[] = [];
      let leftPoint: P | null = null;
      let rightPoint: P | null = null;
      let prevPoint: P | null = null;
      points.forEach(point => {
        if (point.x >= start && !leftPoint && prevPoint) {
          leftPoint = prevPoint;
        }
        if (point.x > end && !rightPoint && prevPoint) {
          rightPoint = point;
        }
        if (point.x >= start && point.x <= end) {
          inView.push(point);
        }
        prevPoint = point;
      });
      return { inView, leftPoint, rightPoint };
    }

    function boundedScan(points: P[], start: number, end: number) {
      const pointCount = points.length;
      const firstInView = lowerBoundByX(points, start);
      const firstAfterView = upperBoundByX(points, end);
      const inView: P[] = [];
      for (let i = firstInView; i < firstAfterView; ++i) {
        inView.push(points[i]);
      }
      let leftPoint: P | null = null;
      let rightPoint: P | null = null;
      const leftIndex = Math.max(firstInView, 1);
      if (firstInView < pointCount && leftIndex < pointCount) {
        leftPoint = points[leftIndex - 1];
      }
      const rightIndex = Math.max(firstAfterView, 1);
      if (firstAfterView < pointCount && rightIndex < pointCount) {
        rightPoint = points[rightIndex];
      }
      return { inView, leftPoint, rightPoint };
    }

    // Deterministic sweep over data shapes and every meaningful window position, including
    // windows entirely before, entirely after, and exactly on point boundaries.
    const datasets: P[][] = [
      [],
      at(50),
      at(10, 20),
      at(10, 10, 10),
      at(0, 10, 20, 30, 40, 50),
      at(5, 5, 15, 15, 25, 25),
    ];

    for (const points of datasets) {
      for (let start = -10; start <= 60; start += 5) {
        for (let end = start; end <= 60; end += 5) {
          expect(boundedScan(points, start, end)).toEqual(linearScan(points, start, end));
        }
      }
    }
  });
});

/**
 * LayerXRange coalesces consecutive same-label points into one box, then skips boxes outside the
 * view. It now resumes at the run start nearest the view (via `lowerBoundByX` plus a backward walk)
 * and breaks once a run begins past the view, rather than scanning every point on every frame.
 *
 * Both are equivalence-critical: resuming mid-run would move a box's left edge, and breaking too
 * early would drop boxes. This models the box geometry the layer produces and pins the bounded
 * form against the full scan.
 */
describe('x-range box scan bounding', () => {
  type XP = { is_gap?: boolean; is_null?: boolean; label: { text: string }; x: number };
  type Box = { endMs: number; label: string; startMs: number };

  function boxes(points: XP[], viewStart: number, viewEnd: number, bounded: boolean): Box[] {
    const out: Box[] = [];

    let scanFrom = 0;
    if (bounded && points.length > 0) {
      const firstInView = lowerBoundByX(points, viewStart);
      let index = Math.min(Math.max(firstInView - 1, 0), points.length - 1);
      while (
        index > 0 &&
        points[index - 1].label.text === points[index].label.text &&
        points[index - 1].is_gap === points[index].is_gap
      ) {
        index--;
      }
      scanFrom = index;
    }

    for (let i = scanFrom; i < points.length; ++i) {
      const point = points[i];
      if (point.is_gap || point.is_null) {
        continue;
      }

      let j = i + 1;
      let nextPoint = points[j];
      while (nextPoint && nextPoint.label.text === point.label.text && nextPoint.is_gap === point.is_gap) {
        j = j + 1;
        nextPoint = points[j];
      }
      i = j - 1;

      const startMs = point.x;
      const endMs = nextPoint ? nextPoint.x : points[i].x;

      if (startMs > viewEnd) {
        if (bounded) {
          break;
        }
        continue;
      }
      if (endMs < viewStart) {
        continue;
      }

      out.push({ endMs, label: point.label.text, startMs });
    }
    return out;
  }

  function makeRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  test('bounded scan produces the same boxes as the full scan', () => {
    const rng = makeRng(0xbeef);

    for (let iteration = 0; iteration < 120; ++iteration) {
      const count = 1 + Math.floor(rng() * 40);
      // Few distinct labels so long runs occur; occasional gaps/nulls to exercise the skip paths.
      const labelPool = ['A', 'B', 'C'].slice(0, 1 + Math.floor(rng() * 3));
      const points: XP[] = [];
      let x = 0;
      for (let i = 0; i < count; ++i) {
        points.push({
          is_gap: rng() < 0.12,
          is_null: rng() < 0.08,
          label: { text: labelPool[Math.floor(rng() * labelPool.length)] },
          x,
        });
        x += 1 + Math.floor(rng() * 10);
      }

      const maxX = points[points.length - 1].x;
      for (let viewStart = -5; viewStart <= maxX + 5; viewStart += 3) {
        for (const span of [0, 1, 7, 25, maxX + 10]) {
          const viewEnd = viewStart + span;
          expect(boxes(points, viewStart, viewEnd, true)).toEqual(boxes(points, viewStart, viewEnd, false));
        }
      }
    }
  });

  test('a single run spanning the whole profile still yields its one box at any zoom', () => {
    const points: XP[] = Array.from({ length: 50 }, (_, i) => ({ label: { text: 'CONSTANT' }, x: i * 10 }));
    for (const [viewStart, viewEnd] of [
      [0, 490],
      [200, 210],
      [-100, -1],
      [500, 600],
    ]) {
      expect(boxes(points, viewStart, viewEnd, true)).toEqual(boxes(points, viewStart, viewEnd, false));
    }
  });
});

/**
 * `getYAxisBounds` no longer scans every resource value on every zoom/pan frame: for sorted,
 * gap-free values it binary-searches the in-view range and reads the nearest numeric neighbour on
 * each side, falling back to the original full scan otherwise (gaps reset the neighbour mid-scan,
 * which makes the result depend on the whole array).
 *
 * `referenceGetYAxisBounds` is the original implementation, kept verbatim as the oracle.
 */
function referenceGetYAxisBounds(yAxis: Axis, layers: Layer[], resources: Resource[], viewTimeRange?: TimeRange) {
  const yAxisLayers = layers.filter(layer => layer.yAxisId === yAxis.id);
  let minY: number | undefined = undefined;
  let maxY: number | undefined = undefined;
  yAxisLayers.forEach(layer => {
    const layerResource = getResourceForLayer(layer, resources) as Resource;
    if (layerResource) {
      let leftValue: ResourceValue | undefined;
      let rightValue: ResourceValue | undefined;
      layerResource.values.forEach(value => {
        const isNumber = typeof value.y === 'number';
        if (viewTimeRange && value.x < viewTimeRange.start) {
          if (value.is_gap) {
            leftValue = undefined;
          } else if (isNumber) {
            if (!leftValue || value.x >= leftValue.x) {
              leftValue = value;
            }
          }
        }
        if (viewTimeRange && value.x > viewTimeRange.end) {
          if (value.is_gap) {
            rightValue = undefined;
          } else if (isNumber) {
            if (!rightValue || value.x < rightValue.x) {
              rightValue = value;
            }
          }
        }
        if (
          typeof value.y === 'number' &&
          (!viewTimeRange ||
            yAxis.domainFitMode !== 'fitTimeWindow' ||
            (value.x >= viewTimeRange.start && value.x <= viewTimeRange.end))
        ) {
          if (minY === undefined || value.y < minY) {
            minY = value.y;
          }
          if (maxY === undefined || value.y > maxY) {
            maxY = value.y;
          }
        }
      });
      if (viewTimeRange) {
        minY = Math.min(
          minY ?? Number.MAX_SAFE_INTEGER,
          leftValue !== undefined && leftValue.y ? (leftValue.y as number) : Number.MAX_SAFE_INTEGER,
          rightValue !== undefined && rightValue.y ? (rightValue.y as number) : Number.MAX_SAFE_INTEGER,
        );
        maxY = Math.max(
          maxY ?? Number.MIN_SAFE_INTEGER,
          leftValue !== undefined && leftValue.y ? (leftValue.y as number) : Number.MIN_SAFE_INTEGER,
          rightValue !== undefined && rightValue.y ? (rightValue.y as number) : Number.MIN_SAFE_INTEGER,
        );
      }
    }
  });
  const scaleDomain = [...(yAxis.scaleDomain || [])];
  if (minY !== undefined) {
    scaleDomain[0] = minY;
  }
  if (maxY !== undefined) {
    scaleDomain[1] = maxY;
  }
  return scaleDomain as number[];
}

describe('getYAxisBounds bounded scan', () => {
  function makeRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  test('matches the original full scan across fit modes, gaps, and window positions', () => {
    const rng = makeRng(0xd0d0);

    for (let iteration = 0; iteration < 150; ++iteration) {
      const timelines = generateTimelines();
      populateTimelineRows(timelines);
      populateTimelineYAxes(timelines);
      populateTimelineLayers(timelines);
      const layers = timelines[0].rows[0].layers;
      layers[1].filter.resource = 'r';
      const baseAxis = timelines[0].rows[0].yAxes[0];

      // Mix of shapes: gap-free (bounded path), gap-bearing (fallback), and non-numeric values
      // interleaved so the "nearest numeric neighbour" logic is exercised.
      const withGaps = iteration % 3 === 0;
      const count = 1 + Math.floor(rng() * 30);
      const values: ResourceValue[] = [];
      let x = 0;
      for (let i = 0; i < count; ++i) {
        const nonNumeric = rng() < 0.15;
        values.push({
          is_gap: withGaps && rng() < 0.2,
          x,
          y: nonNumeric ? (`label-${i}` as unknown as number) : Math.round((rng() - 0.5) * 200),
        });
        x += 1 + Math.floor(rng() * 4);
      }
      const resources: Resource[] = [{ name: 'r', schema: { type: 'real' }, values }];

      const maxX = values[values.length - 1].x;
      for (const domainFitMode of ['fitTimeWindow', 'fitPlan'] as const) {
        const yAxis: Axis = { ...baseAxis, domainFitMode };

        // No view range at all.
        expect(getYAxisBounds(yAxis, layers, resources)).toEqual(
          referenceGetYAxisBounds(yAxis, layers, resources),
        );

        for (let start = -2; start <= maxX + 2; start += 2) {
          for (const span of [0, 3, 11, maxX + 4]) {
            const viewTimeRange: TimeRange = { end: start + span, start };
            expect(getYAxisBounds(yAxis, layers, resources, viewTimeRange)).toEqual(
              referenceGetYAxisBounds(yAxis, layers, resources, viewTimeRange),
            );
          }
        }
      }
    }
  });
});
