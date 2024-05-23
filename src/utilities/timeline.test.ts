import { expect, test } from 'vitest';
import type { ActivityDirective } from '../types/activity';
import type { Resource, ResourceType, Span } from '../types/simulation';
import type { TimeRange, Timeline } from '../types/timeline';
import {
  createHorizontalGuide,
  createRow,
  createTimeline,
  createTimelineActivityLayer,
  createTimelineLineLayer,
  createTimelineXRangeLayer,
  createVerticalGuide,
  createYAxis,
  directiveInView,
  duplicateRow,
  filterResourcesByLayer,
  getYAxisBounds,
  isActivityLayer,
  isLineLayer,
  isXRangeLayer,
  spanInView,
} from './timeline';

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

function generateSpan(properties: Partial<Span>): Span {
  return {
    attributes: { arguments: {}, computedAttributes: {} },
    dataset_id: 1,
    duration: '',
    durationMs: 1,
    endMs: 1,
    id: 1,
    parent_id: null,
    startMs: 0,
    start_offset: '',
    type: 'foo',
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

  expect(timelines[1].rows[0].layers[0].chartType).toBe('activity');
  expect(timelines[1].rows[0].layers[0].id).toBe(6);
  expect(timelines[1].rows[0].layers[0].yAxisId).toBe(null);
  expect(timelines[1].rows[0].layers[1].chartType).toBe('line');
  expect(timelines[1].rows[0].layers[1].id).toBe(7);
  expect(timelines[1].rows[0].layers[1].yAxisId).toBe(2);
  expect(timelines[1].rows[0].layers[2].chartType).toBe('x-range');
  expect(timelines[1].rows[0].layers[2].id).toBe(8);
  expect(timelines[1].rows[0].layers[2].yAxisId).toBe(2);
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
  layer1.filter.resource = { names: ['resourceWithValues', 'resourceWithNoValues'] };
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
  layer2.filter.resource = { names: [] };
  expect(filterResourcesByLayer(layer2, [])).to.deep.equal([]);

  const layer3 = createTimelineLineLayer([], []);
  layer3.filter.resource = { names: ['resourceA'] };
  expect(filterResourcesByLayer(layer3, [resourceA, resourceB])).to.deep.equal([resourceA]);
});

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

test('isActivityLayer', () => {
  expect(isActivityLayer(createTimelineActivityLayer([]))).toBe(true);
  expect(isActivityLayer(createTimelineLineLayer([], []))).toBe(false);
  expect(isActivityLayer(createTimelineXRangeLayer([], []))).toBe(false);
});

test('isLineLayer', () => {
  expect(isLineLayer(createTimelineActivityLayer([]))).toBe(false);
  expect(isLineLayer(createTimelineLineLayer([], []))).toBe(true);
  expect(isLineLayer(createTimelineXRangeLayer([], []))).toBe(false);
});

test('isXRangeLayer', () => {
  expect(isXRangeLayer(createTimelineActivityLayer([]))).toBe(false);
  expect(isXRangeLayer(createTimelineLineLayer([], []))).toBe(false);
  expect(isXRangeLayer(createTimelineXRangeLayer([], []))).toBe(true);
});
