import { expect, test } from 'vitest';
import type { Resource } from '../types/simulation';
import type { Axis, Layer } from '../types/timeline';
import { createTimelineLayer, createYAxis, getNextID, getYAxisBounds } from './timeline';

test('getNextID', () => {
  const genIDs = (ids: number[]) => ids.map(id => ({ id }));

  expect(getNextID([])).toEqual(0);
  expect(getNextID(genIDs([0]))).toEqual(1);
  expect(getNextID(genIDs([0, 1, 2, 3, 4]))).toEqual(5);
  expect(getNextID(genIDs([0, 1, 3, 4, 6]))).toEqual(7);
  expect(getNextID(genIDs([0, -1, -2, 2, -5]))).toEqual(3);
});

test('getYAxisBounds', () => {
  const yAxis: Axis = createYAxis([]);
  const layer1 = createTimelineLayer([], [yAxis]);
  const layer2 = createTimelineLayer([layer1], [yAxis]);
  const layers: Layer[] = [layer1, layer2];
  const resource: Resource = {
    name: 'test',
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
    name: 'test',
    schema: {
      items: { initial: { type: 'real' }, rate: { type: 'real' } },
      type: 'struct',
    },
    values: [],
  };
  const resourcesByViewLayerId = { [layer1.id]: [resource], [layer2.id]: [] };
  expect(getYAxisBounds(yAxis, [], {})).toEqual(yAxis.scaleDomain);
  expect(getYAxisBounds(yAxis, layers, {})).toEqual(yAxis.scaleDomain);
  expect(getYAxisBounds(yAxis, layers, resourcesByViewLayerId)).toEqual([10, 15]);
  expect(getYAxisBounds(yAxis, layers, { [layer1.id]: [resourceWithNoValues] })).toEqual(yAxis.scaleDomain);
});
