import { keyBy } from 'lodash-es';
import { describe, expect, test } from 'vitest';
import {
  ViewDefaultSectionColor,
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
  applyTimelineItemDrop,
  createHorizontalGuide,
  createRow,
  createSection,
  createTimeline,
  createTimelineActivityLayer,
  createTimelineExternalEventLayer,
  createTimelineLineLayer,
  createTimelineXRangeLayer,
  createVerticalGuide,
  createYAxis,
  directiveInView,
  duplicateRow,
  duplicateSection,
  externalEventInView,
  generateDiscreteTreeUtil,
  getContrastRatio,
  getContrastingTextColor,
  getMatchingTypesForActivityLayerFilter,
  getNextSectionID,
  getResourceForLayer,
  getRenderableTimelineItems,
  getRowSection,
  getTimeRangeAroundTime,
  getUniqueColorForActivityLayer,
  getUniqueColorForLineLayer,
  getUniqueColorSchemeForXRangeLayer,
  getYAxisBounds,
  insertRowAfterInTimelineHierarchy,
  isActivityLayer,
  isExternalEventLayer,
  isLineLayer,
  isXRangeLayer,
  matchesDynamicFilter,
  moveTimelineItemInHierarchy,
  paginateNodes,
  removeRowFromTimelineHierarchy,
  resolveSectionDropEdge,
  spanInView,
  toTimelineDropEdge,
  ungroupAllTimelineSections,
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

describe('Timeline sections', () => {
  /** Root order: row r0, section [r1, r2], row r3. */
  function buildSectionedTimeline() {
    const timeline = createTimeline([]);
    const r0 = createRow([timeline]);
    timeline.rows.push(r0);
    const r1 = createRow([timeline]);
    timeline.rows.push(r1);
    const r2 = createRow([timeline]);
    timeline.rows.push(r2);
    const r3 = createRow([timeline]);
    timeline.rows.push(r3);

    const section = createSection([timeline], { rowIds: [r1.id, r2.id] });
    timeline.sections.push(section);

    timeline.items = [
      { id: r0.id, type: 'row' },
      { id: section.id, type: 'section' },
      { id: r3.id, type: 'row' },
    ];

    return { r0, r1, r2, r3, section, timeline };
  }

  test('getNextSectionID returns max + 1 across all timelines', () => {
    const a = createTimeline([]);
    const b = createTimeline([a]);
    expect(getNextSectionID([a, b])).toBe(0);

    a.sections.push(createSection([a], { id: 0 }));
    b.sections.push(createSection([a, b], { id: 5 }));
    expect(getNextSectionID([a, b])).toBe(6);
  });

  test('createSection returns sensible defaults and a unique id', () => {
    const timeline = createTimeline([]);
    const section = createSection([timeline]);
    expect(section).toMatchObject({
      collapsed: false,
      color: ViewDefaultSectionColor,
      id: 0,
      name: 'Section',
      rowIds: [],
    });

    timeline.sections.push(section);
    const next = createSection([timeline]);
    expect(next.id).toBe(1);
  });

  test('getRowSection finds the owning section, or null for root rows', () => {
    const { r0, r1, section, timeline } = buildSectionedTimeline();
    expect(getRowSection(timeline, r1.id)).toBe(section);
    expect(getRowSection(timeline, r0.id)).toBeNull();
    expect(getRowSection(timeline, 999)).toBeNull();
  });

  test('createSection defaults to a real color so every section renders the same way', () => {
    expect(createSection([createTimeline([])]).color).toBe(ViewDefaultSectionColor);
  });

  test('getContrastingTextColor picks the foreground that actually scores higher', () => {
    // Dark bands take light text, light bands take dark text.
    expect(getContrastingTextColor('#000000')).toBe('#ffffff');
    expect(getContrastingTextColor('#ffffff')).toBe('#1b1d1f');

    // The presets are pale, so they all resolve to dark text.
    expect(getContrastingTextColor('#fcdd8f')).toBe('#1b1d1f');
    expect(getContrastingTextColor('#A3A3A3')).toBe('#1b1d1f');

    // Mid-tone blue is the case a naive lightness threshold gets wrong.
    expect(getContrastingTextColor('#0000ff')).toBe('#ffffff');
  });

  test('getContrastingTextColor clears WCAG AA for every built-in preset', () => {
    ViewDiscreteLayerColorPresets.forEach(color => {
      expect(getContrastRatio(color, getContrastingTextColor(color))).toBeGreaterThanOrEqual(4.5);
    });
  });

  test('getContrastingTextColor returns the best available foreground even when neither hits AA', () => {
    // #ff0000 scores 4.23 against near-black and 4.00 against white, so nothing reaches AA. A
    // band in such a color cannot carry AA text at all; the helper returns the better of the two.
    const best = getContrastRatio('#ff0000', getContrastingTextColor('#ff0000'));
    expect(best).toBeCloseTo(4.23, 1);
    expect(best).toBeGreaterThanOrEqual(getContrastRatio('#ff0000', '#ffffff'));
    expect(best).toBeGreaterThanOrEqual(3);
  });

  test('getContrastingTextColor tolerates short hex and a missing hash', () => {
    expect(getContrastingTextColor('#000')).toBe('#ffffff');
    expect(getContrastingTextColor('fff')).toBe('#1b1d1f');
  });

  test('getContrastRatio spans 1 to 21', () => {
    expect(getContrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(getContrastRatio('#7a7a7a', '#7a7a7a')).toBeCloseTo(1, 5);
  });

  test('duplicateSection copies the section, its rows, and its styling', () => {
    const { r1, r2, section, timeline } = buildSectionedTimeline();
    section.color = '#ff0000';
    section.collapsed = true;

    const result = duplicateSection(section, timeline, [timeline]);

    expect(result).not.toBeNull();
    expect(result?.section.name).toBe('Section (copy)');
    expect(result?.section.color).toBe('#ff0000');
    expect(result?.section.collapsed).toBe(true);
    expect(result?.section.id).not.toBe(section.id);

    // Both rows are copied, and the copy owns the new row ids rather than the originals.
    expect(result?.rows).toHaveLength(2);
    expect(result?.section.rowIds).toEqual(result?.rows.map(r => r.id));
    expect(result?.section.rowIds).not.toContain(r1.id);
    expect(result?.section.rowIds).not.toContain(r2.id);
  });

  test('duplicateSection gives every copied row a distinct id', () => {
    const { section, timeline } = buildSectionedTimeline();
    const result = duplicateSection(section, timeline, [timeline]);
    const ids = result?.rows.map(r => r.id) ?? [];

    // Regression guard: duplicating rows one at a time against the same timeline list
    // hands out the same id twice unless each copy is fed back into the working list.
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(undefined);
  });

  test('duplicateSection returns null when the timeline is not in the list', () => {
    const { section, timeline } = buildSectionedTimeline();
    expect(duplicateSection(section, timeline, [])).toBeNull();
  });

  test('duplicateSection copies an empty section', () => {
    const timeline = createTimeline([]);
    const section = createSection([timeline], { name: 'Empty' });
    timeline.sections.push(section);

    const result = duplicateSection(section, timeline, [timeline]);

    expect(result?.rows).toEqual([]);
    expect(result?.section.rowIds).toEqual([]);
    expect(result?.section.name).toBe('Empty (copy)');
  });

  test('removeRowFromTimelineHierarchy drops a root-level row from items', () => {
    const { r0, r1, r2, r3, section, timeline } = buildSectionedTimeline();
    const { items, sections } = removeRowFromTimelineHierarchy(timeline, r0.id);

    expect(items).toEqual([
      { id: section.id, type: 'section' },
      { id: r3.id, type: 'row' },
    ]);
    // A root-level removal must leave the sections untouched.
    expect(sections[0].rowIds).toEqual([r1.id, r2.id]);
  });

  test('removeRowFromTimelineHierarchy drops a grouped row from its section', () => {
    const { r0, r1, r2, r3, section, timeline } = buildSectionedTimeline();
    const { items, sections } = removeRowFromTimelineHierarchy(timeline, r1.id);

    expect(sections[0].rowIds).toEqual([r2.id]);
    expect(items).toEqual([
      { id: r0.id, type: 'row' },
      { id: section.id, type: 'section' },
      { id: r3.id, type: 'row' },
    ]);
  });

  test('removeRowFromTimelineHierarchy is a no-op for an unknown row', () => {
    const { timeline } = buildSectionedTimeline();
    const { items, sections } = removeRowFromTimelineHierarchy(timeline, 999);

    expect(items).toEqual(timeline.items);
    expect(sections).toEqual(timeline.sections);
  });

  test('insertRowAfterInTimelineHierarchy places a row next to a root-level neighbor', () => {
    const { r0, r1, r2, r3, section, timeline } = buildSectionedTimeline();
    const { items, sections } = insertRowAfterInTimelineHierarchy(timeline, r0.id, 42);

    expect(items).toEqual([
      { id: r0.id, type: 'row' },
      { id: 42, type: 'row' },
      { id: section.id, type: 'section' },
      { id: r3.id, type: 'row' },
    ]);
    expect(sections[0].rowIds).toEqual([r1.id, r2.id]);
  });

  test('insertRowAfterInTimelineHierarchy places a row inside its neighbor’s section', () => {
    const { r1, r2, timeline } = buildSectionedTimeline();
    const { items, sections } = insertRowAfterInTimelineHierarchy(timeline, r1.id, 42);

    // The new row joins the section rather than appearing at the root level.
    expect(sections[0].rowIds).toEqual([r1.id, 42, r2.id]);
    expect(items).toEqual(timeline.items);
  });

  test('insertRowAfterInTimelineHierarchy appends when the neighbor is not in the hierarchy', () => {
    const { r0, r3, section, timeline } = buildSectionedTimeline();
    const { items } = insertRowAfterInTimelineHierarchy(timeline, 999, 42);

    expect(items).toEqual([
      { id: r0.id, type: 'row' },
      { id: section.id, type: 'section' },
      { id: r3.id, type: 'row' },
      { id: 42, type: 'row' },
    ]);
  });
});

describe('resolveSectionDropEdge', () => {
  // A section header as the geometry helper sees it.
  const header = { bottom: 128, height: 28, top: 100 };

  test('a dragged section splits the header in half', () => {
    expect(resolveSectionDropEdge(header, 101, 'section')).toBe('top');
    expect(resolveSectionDropEdge(header, 113, 'section')).toBe('top');
    expect(resolveSectionDropEdge(header, 115, 'section')).toBe('bottom');
    expect(resolveSectionDropEdge(header, 127, 'section')).toBe('bottom');
  });

  test('a dragged row reorders only from the top band', () => {
    // 28px header -> an 8px band (28/3 clamped to the 8px maximum).
    expect(resolveSectionDropEdge(header, 100, 'row')).toBe('top');
    expect(resolveSectionDropEdge(header, 107, 'row')).toBe('top');
    expect(resolveSectionDropEdge(header, 108, 'row')).toBeNull();
    expect(resolveSectionDropEdge(header, 120, 'row')).toBeNull();
  });

  test('a dragged row has no bottom band', () => {
    // Regression guard: a bottom band drew a line under the header, pointing at the slot before
    // the section's first row, then inserted the row after the whole section.
    expect(resolveSectionDropEdge(header, header.bottom - 1, 'row')).toBeNull();
    expect(resolveSectionDropEdge(header, header.bottom, 'row')).toBeNull();
  });

  test('the band is clamped so it stays usable at any header height', () => {
    // Too short for a proportional band: it floors at 4px rather than vanishing.
    const short = { bottom: 109, height: 9, top: 100 };
    expect(resolveSectionDropEdge(short, 103, 'row')).toBe('top');
    expect(resolveSectionDropEdge(short, 105, 'row')).toBeNull();

    // Tall enough that a third would swallow most of the header: it caps at 8px.
    const tall = { bottom: 200, height: 100, top: 100 };
    expect(resolveSectionDropEdge(tall, 107, 'row')).toBe('top');
    expect(resolveSectionDropEdge(tall, 109, 'row')).toBeNull();
  });
});

describe('toTimelineDropEdge', () => {
  test('passes through the two edges a timeline understands', () => {
    expect(toTimelineDropEdge('top')).toBe('top');
    expect(toTimelineDropEdge('bottom')).toBe('bottom');
  });

  test('rejects everything else', () => {
    // The hitbox helper is typed for all four sides even when only two are requested.
    expect(toTimelineDropEdge('left')).toBeNull();
    expect(toTimelineDropEdge('right')).toBeNull();
    expect(toTimelineDropEdge(null)).toBeNull();
    expect(toTimelineDropEdge(undefined)).toBeNull();
  });
});

describe('applyTimelineItemDrop', () => {
  /**
   * A hierarchy of: row 10, section 100 [rows 11, 12], row 13, section 200 [row 14].
   * Ids are spread apart so a mix-up between a row id and a section id cannot pass by accident.
   */
  function buildHierarchy() {
    return {
      items: [
        { id: 10, type: 'row' },
        { id: 100, type: 'section' },
        { id: 13, type: 'row' },
        { id: 200, type: 'section' },
      ] as Timeline['items'],
      sections: [
        { collapsed: false, color: null, id: 100, name: 'A', rowIds: [11, 12] },
        { collapsed: false, color: null, id: 200, name: 'B', rowIds: [14] },
      ] as Timeline['sections'],
    };
  }

  const row = (id: number, sourceSectionId: number | null = null) =>
    ({ itemId: id, itemType: 'row', sourceSectionId }) as const;
  const section = (id: number) => ({ itemId: id, itemType: 'section', sourceSectionId: null }) as const;
  const atRow = (id: number, sectionId: number | null = null) => ({ itemId: id, itemType: 'row', sectionId }) as const;
  const atSection = (id: number) => ({ itemId: id, itemType: 'section', sectionId: null }) as const;

  test('reorders a root row above and below another root row', () => {
    const above = applyTimelineItemDrop(buildHierarchy(), { edge: 'top', source: row(13), target: atRow(10) });
    expect(above?.items).toEqual([
      { id: 13, type: 'row' },
      { id: 10, type: 'row' },
      { id: 100, type: 'section' },
      { id: 200, type: 'section' },
    ]);

    const below = applyTimelineItemDrop(buildHierarchy(), { edge: 'bottom', source: row(10), target: atRow(13) });
    expect(below?.items).toEqual([
      { id: 100, type: 'section' },
      { id: 13, type: 'row' },
      { id: 10, type: 'row' },
      { id: 200, type: 'section' },
    ]);
  });

  test('drops a root row into a section, appended to its rows', () => {
    const next = applyTimelineItemDrop(buildHierarchy(), { edge: null, source: row(10), target: atSection(100) });

    expect(next?.sections[0].rowIds).toEqual([11, 12, 10]);
    // The row leaves the root level rather than being listed in both places.
    expect(next?.items).toEqual([
      { id: 100, type: 'section' },
      { id: 13, type: 'row' },
      { id: 200, type: 'section' },
    ]);
  });

  test('drops a row into an empty section', () => {
    const hierarchy = buildHierarchy();
    hierarchy.sections[1].rowIds = [];

    const next = applyTimelineItemDrop(hierarchy, { edge: null, source: row(10), target: atSection(200) });

    expect(next?.sections[1].rowIds).toEqual([10]);
  });

  test('moves a row out of a section back to the root level', () => {
    const next = applyTimelineItemDrop(buildHierarchy(), {
      edge: 'top',
      source: row(11, 100),
      target: atRow(10),
    });

    expect(next?.sections[0].rowIds).toEqual([12]);
    expect(next?.items).toEqual([
      { id: 11, type: 'row' },
      { id: 10, type: 'row' },
      { id: 100, type: 'section' },
      { id: 13, type: 'row' },
      { id: 200, type: 'section' },
    ]);
  });

  test('moves a row from one section to another', () => {
    const next = applyTimelineItemDrop(buildHierarchy(), {
      edge: 'bottom',
      source: row(11, 100),
      target: atRow(14, 200),
    });

    expect(next?.sections[0].rowIds).toEqual([12]);
    expect(next?.sections[1].rowIds).toEqual([14, 11]);
    // A move between sections never touches the root ordering.
    expect(next?.items).toEqual(buildHierarchy().items);
  });

  test('reorders rows within one section', () => {
    const next = applyTimelineItemDrop(buildHierarchy(), {
      edge: 'top',
      source: row(12, 100),
      target: atRow(11, 100),
    });

    expect(next?.sections[0].rowIds).toEqual([12, 11]);
  });

  test('reorders a section against another section', () => {
    const next = applyTimelineItemDrop(buildHierarchy(), {
      edge: 'top',
      source: section(200),
      target: atSection(100),
    });

    expect(next?.items).toEqual([
      { id: 10, type: 'row' },
      { id: 200, type: 'section' },
      { id: 100, type: 'section' },
      { id: 13, type: 'row' },
    ]);
    // Reordering a section carries its rows with it - they are addressed by the section, not by items.
    expect(next?.sections[1].rowIds).toEqual([14]);
  });

  test('appends rather than inserting next-to-last when the target is gone', () => {
    // Regression guard: findIndex returning -1 used to fall through to splice(-1, 0, …), which
    // silently drops the item one place from the end instead of at it.
    const next = applyTimelineItemDrop(buildHierarchy(), { edge: 'bottom', source: row(10), target: atRow(999) });

    expect(next?.items).toEqual([
      { id: 100, type: 'section' },
      { id: 13, type: 'row' },
      { id: 200, type: 'section' },
      { id: 10, type: 'row' },
    ]);
  });

  test('appends to the target section when the neighbouring row is gone', () => {
    const next = applyTimelineItemDrop(buildHierarchy(), {
      edge: 'bottom',
      source: row(10),
      target: atRow(999, 200),
    });

    expect(next?.sections[1].rowIds).toEqual([14, 10]);
  });

  test('is a no-op when an item is dropped on itself', () => {
    expect(applyTimelineItemDrop(buildHierarchy(), { edge: 'top', source: row(10), target: atRow(10) })).toBeNull();
    expect(
      applyTimelineItemDrop(buildHierarchy(), { edge: 'bottom', source: section(100), target: atSection(100) }),
    ).toBeNull();
  });

  test('is a no-op when a row is dropped onto the section it already belongs to', () => {
    expect(
      applyTimelineItemDrop(buildHierarchy(), { edge: null, source: row(11, 100), target: atSection(100) }),
    ).toBeNull();
  });

  test('a row already in a section can still leave it by an edge of its own header', () => {
    // The no-op above must not swallow this: the same row and the same section header, but aimed
    // at the reorder band rather than at the section itself.
    const next = applyTimelineItemDrop(buildHierarchy(), {
      edge: 'top',
      source: row(11, 100),
      target: atSection(100),
    });

    expect(next?.sections[0].rowIds).toEqual([12]);
    expect(next?.items).toEqual([
      { id: 10, type: 'row' },
      { id: 11, type: 'row' },
      { id: 100, type: 'section' },
      { id: 13, type: 'row' },
      { id: 200, type: 'section' },
    ]);
  });

  test('refuses to nest a section inside a section', () => {
    expect(
      applyTimelineItemDrop(buildHierarchy(), { edge: 'bottom', source: section(200), target: atRow(11, 100) }),
    ).toBeNull();
  });

  test('a section dropped on a root row still reorders', () => {
    const next = applyTimelineItemDrop(buildHierarchy(), { edge: 'top', source: section(200), target: atRow(10) });

    expect(next?.items).toEqual([
      { id: 200, type: 'section' },
      { id: 10, type: 'row' },
      { id: 100, type: 'section' },
      { id: 13, type: 'row' },
    ]);
  });

  test('never mutates the hierarchy it was given', () => {
    const hierarchy = buildHierarchy();
    const itemsBefore = JSON.stringify(hierarchy.items);
    const sectionsBefore = JSON.stringify(hierarchy.sections);

    applyTimelineItemDrop(hierarchy, { edge: null, source: row(11, 100), target: atSection(200) });

    expect(JSON.stringify(hierarchy.items)).toBe(itemsBefore);
    expect(JSON.stringify(hierarchy.sections)).toBe(sectionsBefore);
  });

  test('tolerates a timeline with no items or sections yet', () => {
    const next = applyTimelineItemDrop(
      { items: [], sections: [] },
      {
        edge: 'top',
        source: row(10),
        target: atRow(999),
      },
    );

    expect(next).toEqual({ items: [{ id: 10, type: 'row' }], sections: [] });
  });
});

describe('moveTimelineItemInHierarchy', () => {
  /** Root order: row 10, section 100 [rows 11, 12, 13], section 200 [row 14]. */
  function buildHierarchy() {
    return {
      items: [
        { id: 10, type: 'row' },
        { id: 100, type: 'section' },
        { id: 200, type: 'section' },
      ] as Timeline['items'],
      sections: [
        { collapsed: false, color: null, id: 100, name: 'A', rowIds: [11, 12, 13] },
        { collapsed: false, color: null, id: 200, name: 'B', rowIds: [14] },
      ] as Timeline['sections'],
    };
  }

  test('moves a root row past its neighbour', () => {
    const next = moveTimelineItemInHierarchy(buildHierarchy(), 'row', 10, 'down');

    expect(next?.items).toEqual([
      { id: 100, type: 'section' },
      { id: 10, type: 'row' },
      { id: 200, type: 'section' },
    ]);
  });

  test('moves a section past its neighbour in both directions', () => {
    expect(moveTimelineItemInHierarchy(buildHierarchy(), 'section', 200, 'up')?.items).toEqual([
      { id: 10, type: 'row' },
      { id: 200, type: 'section' },
      { id: 100, type: 'section' },
    ]);
    expect(moveTimelineItemInHierarchy(buildHierarchy(), 'section', 100, 'up')?.items).toEqual([
      { id: 100, type: 'section' },
      { id: 10, type: 'row' },
      { id: 200, type: 'section' },
    ]);
  });

  test('moves a grouped row within its own section', () => {
    const down = moveTimelineItemInHierarchy(buildHierarchy(), 'row', 11, 'down');
    expect(down?.sections[0].rowIds).toEqual([12, 11, 13]);
    // The root order is untouched by a move inside a section.
    expect(down?.items).toEqual(buildHierarchy().items);

    const up = moveTimelineItemInHierarchy(buildHierarchy(), 'row', 13, 'up');
    expect(up?.sections[0].rowIds).toEqual([11, 13, 12]);
  });

  test('a grouped row cannot step out of its section', () => {
    // The first and last rows of a section have nowhere left to go. Moving out is a drag, not a
    // one-step nudge, so these are refusals rather than escapes to the root level.
    expect(moveTimelineItemInHierarchy(buildHierarchy(), 'row', 11, 'up')).toBeNull();
    expect(moveTimelineItemInHierarchy(buildHierarchy(), 'row', 13, 'down')).toBeNull();
    expect(moveTimelineItemInHierarchy(buildHierarchy(), 'row', 14, 'up')).toBeNull();
  });

  test('refuses to move past either end of the root order', () => {
    expect(moveTimelineItemInHierarchy(buildHierarchy(), 'row', 10, 'up')).toBeNull();
    expect(moveTimelineItemInHierarchy(buildHierarchy(), 'section', 200, 'down')).toBeNull();
  });

  test('refuses to move something that is not there', () => {
    expect(moveTimelineItemInHierarchy(buildHierarchy(), 'row', 999, 'up')).toBeNull();
    expect(moveTimelineItemInHierarchy(buildHierarchy(), 'section', 999, 'down')).toBeNull();
  });

  test('does not confuse a row id with a section id', () => {
    // Ids are unique per kind, not across kinds, so a lookup that ignores the type can move the
    // wrong thing. Here a row and a section deliberately share the id 100.
    const hierarchy = buildHierarchy();
    hierarchy.items = [
      { id: 100, type: 'row' },
      { id: 100, type: 'section' },
    ];

    expect(moveTimelineItemInHierarchy(hierarchy, 'section', 100, 'up')?.items).toEqual([
      { id: 100, type: 'section' },
      { id: 100, type: 'row' },
    ]);
  });

  test('never mutates the hierarchy it was given', () => {
    const hierarchy = buildHierarchy();
    const before = JSON.stringify(hierarchy);

    moveTimelineItemInHierarchy(hierarchy, 'row', 11, 'down');
    moveTimelineItemInHierarchy(hierarchy, 'section', 100, 'down');

    expect(JSON.stringify(hierarchy)).toBe(before);
  });
});

describe('getRenderableTimelineItems', () => {
  function buildTimeline() {
    return {
      items: [
        { id: 10, type: 'row' },
        { id: 100, type: 'section' },
      ] as Timeline['items'],
      rows: [{ id: 10 }, { id: 11 }] as Timeline['rows'],
      sections: [{ collapsed: false, color: null, id: 100, name: 'A', rowIds: [11] }] as Timeline['sections'],
    };
  }

  test('passes a consistent hierarchy through untouched', () => {
    const timeline = buildTimeline();
    expect(getRenderableTimelineItems(timeline)).toEqual(timeline.items);
  });

  test('drops a ref to a section that no longer exists', () => {
    const timeline = buildTimeline();
    timeline.sections = [];

    expect(getRenderableTimelineItems(timeline)).toEqual([{ id: 10, type: 'row' }]);
  });

  test('drops a ref to a row that no longer exists', () => {
    const timeline = buildTimeline();
    timeline.rows = [{ id: 11 }] as Timeline['rows'];

    expect(getRenderableTimelineItems(timeline)).toEqual([{ id: 100, type: 'section' }]);
  });

  test('drops a duplicate ref, keeping the first', () => {
    // The crash this exists for: a ghost `section-0` left in items, plus a new section that
    // reuses id 0, is two entries keyed `section-0` - which throws out of the keyed each.
    const timeline = buildTimeline();
    timeline.items = [
      { id: 100, type: 'section' },
      { id: 10, type: 'row' },
      { id: 100, type: 'section' },
    ];

    expect(getRenderableTimelineItems(timeline)).toEqual([
      { id: 100, type: 'section' },
      { id: 10, type: 'row' },
    ]);
  });

  test('a row and a section may share an id without colliding', () => {
    // Ids are unique per kind, not across kinds, so the two refs are distinct items.
    const timeline = buildTimeline();
    timeline.items = [
      { id: 100, type: 'section' },
      { id: 100, type: 'row' },
    ];
    timeline.rows = [{ id: 100 }] as Timeline['rows'];

    expect(getRenderableTimelineItems(timeline)).toHaveLength(2);
  });

  test('drops a root ref to a row a section has also claimed', () => {
    const timeline = buildTimeline();
    timeline.items = [
      { id: 11, type: 'row' },
      { id: 100, type: 'section' },
    ];

    // Row 11 belongs to section 100; listing it at the root as well drew it twice.
    expect(getRenderableTimelineItems(timeline)).toEqual([{ id: 100, type: 'section' }]);
  });

  test('tolerates a timeline with nothing in it', () => {
    expect(getRenderableTimelineItems({ items: [], rows: [], sections: [] })).toEqual([]);
  });
});

describe('ungroupAllTimelineSections', () => {
  test('replaces each section with the rows it held, in place', () => {
    const next = ungroupAllTimelineSections({
      items: [
        { id: 10, type: 'row' },
        { id: 100, type: 'section' },
        { id: 13, type: 'row' },
        { id: 200, type: 'section' },
      ],
      sections: [
        { collapsed: false, color: null, id: 100, name: 'A', rowIds: [11, 12] },
        { collapsed: false, color: null, id: 200, name: 'B', rowIds: [14] },
      ],
    });

    // Regression guard: emptying `sections` alone left rows 11, 12 and 14 referenced by nothing,
    // so they vanished from the timeline while still sitting in `timeline.rows`.
    expect(next.items).toEqual([
      { id: 10, type: 'row' },
      { id: 11, type: 'row' },
      { id: 12, type: 'row' },
      { id: 13, type: 'row' },
      { id: 14, type: 'row' },
    ]);
    expect(next.sections).toEqual([]);
  });

  test('leaves no section refs behind for a reused id to collide with', () => {
    const next = ungroupAllTimelineSections({
      items: [{ id: 0, type: 'section' }],
      sections: [{ collapsed: false, color: null, id: 0, name: 'A', rowIds: [] }],
    });

    expect(next.items).toEqual([]);
  });

  test('is a no-op on a timeline with no sections', () => {
    const items = [{ id: 10, type: 'row' as const }];
    expect(ungroupAllTimelineSections({ items, sections: [] })).toEqual({ items, sections: [] });
  });
});
