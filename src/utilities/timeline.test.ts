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
import type { Resource, ResourceType, Span, SpanUtilityMaps, SpansMap } from '../types/simulation';
import type { Tag } from '../types/tags';
import type { DiscreteTreeNode, TimeRange, Timeline, XRangeLayer } from '../types/timeline';
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
  filterResourcesByLayer,
  generateDiscreteTreeUtil,
  getMatchingTypesForActivityLayerFilter,
  getTimeRangeAroundTime,
  getUniqueColorForActivityLayer,
  getUniqueColorForLineLayer,
  getUniqueColorSchemeForXRangeLayer,
  getYAxisBounds,
  isActivityLayer,
  isExternalEventLayer,
  isLineLayer,
  isXRangeLayer,
  matchesDynamicFilter,
  paginateNodes,
  spanInView,
} from './timeline';

const testActivityTypes: ActivityType[] = [
  {
    computed_attributes_value_schema: {
      items: {},
      type: 'struct',
    },
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

test('filterResourcesByLayer', () => {
  const resourceA: ResourceType = {
    name: 'resourceA',
    schema: {
      items: { initial: { type: 'real' }, rate: { type: 'real' } },
      type: 'struct',
    },
  };
  const resourceB: ResourceType = {
    name: 'resourceB',
    schema: {
      items: { initial: { type: 'real' }, rate: { type: 'real' } },
      type: 'struct',
    },
  };
  const layer = createTimelineLineLayer([], []);
  expect(filterResourcesByLayer(layer, [resourceA, resourceB])).to.deep.equal([]);

  const layer2 = createTimelineLineLayer([], []);
  expect(filterResourcesByLayer(layer2, [])).to.deep.equal([]);

  const layer3 = createTimelineLineLayer([], []);
  layer3.filter.resource = 'resourceA';
  expect(filterResourcesByLayer(layer3, [resourceA, resourceB])).to.deep.equal([resourceA]);
});

// TODO - should we make a test case for filtering the sources in an ExternalEventsLayer?

test('directiveInView', () => {
  const viewTimeRange: TimeRange = { end: 1716332383895 + 60000, start: 1716332383895 }; // One minute duration
  expect(directiveInView(generateActivityDirective({ start_time_ms: null }), viewTimeRange)).toBe(false);
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
