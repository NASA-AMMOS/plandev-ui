import { expect, test } from 'vitest';
import type { Resource, ResourceType } from '../types/simulation';
import type { Timeline } from '../types/timeline';
import {
  createHorizontalGuide,
  createRow,
  createTimeline,
  createTimelineActivityLayer,
  createTimelineLineLayer,
  createTimelineXRangeLayer,
  createVerticalGuide,
  createYAxis,
  duplicateRow,
  filterResourcesByLayer,
  getYAxisBounds,
} from './timeline';

function genTimelines() {
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

test('createTimeline', () => {
  const timelines = genTimelines();
  expect(timelines[0].id).toBe(0);
  expect(timelines[1].id).toBe(1);
});

test('createRow', () => {
  const timelines = genTimelines();
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
  const timelines = genTimelines();
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
  const timelines = genTimelines();
  populateTimelineRows(timelines);
  populateTimelineYAxes(timelines);
  populateTimelineHorizontalGuides(timelines);

  // Check IDs
  expect(timelines[0].rows[0].horizontalGuides[0].id).toBe(0);
  expect(timelines[0].rows[1].horizontalGuides[0].id).toBe(2);
});

test('createVerticalGuide', () => {
  const timelines = genTimelines();
  populateTimelineVerticalGuides(timelines);

  // Check IDs
  expect(timelines[0].verticalGuides[0].id).toBe(0);
  expect(timelines[1].verticalGuides[0].id).toBe(2);
});

test('getYAxisBounds', () => {
  const timelines = genTimelines();
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
  const timelines = genTimelines();
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
