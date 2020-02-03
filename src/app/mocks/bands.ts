import * as d3 from 'd3';
import random from 'lodash-es/random';
import range from 'lodash-es/range';
import uniqueId from 'lodash-es/uniqueId';
import { getUnixEpochTime } from '../functions';
import {
  Band,
  CPlan,
  PointLine,
  PointXRange,
  SimulationResults,
  StringTMap,
  SubBandLine,
  SubBandXRange,
} from '../types';

export function getLineBand(
  plan: CPlan,
  scaleDomain = [0, 4],
  pointCount: number = 100,
): StringTMap<Band> {
  const id = uniqueId('band');
  const start = getUnixEpochTime(plan.startTimestamp) + 1000;
  const end = getUnixEpochTime(plan.endTimestamp);
  const xStep = (end - start) / pointCount;
  const [min, max] = scaleDomain;

  const points: PointLine[] = range(pointCount).map(i => {
    const x = start + xStep * i;
    const y = random(min + 0.5, max - 0.5, true);

    return {
      color: '#2e5090',
      id: uniqueId('pointLine'),
      radius: 4,
      selected: false,
      type: 'line',
      x,
      y,
    };
  });

  const subBands: SubBandLine[] = [
    {
      id: uniqueId('subBandLine'),
      points,
      type: 'line',
    },
  ];

  return {
    [id]: {
      height: 200,
      id,
      order: 0,
      subBands,
      yAxis: {
        labelFillColor: '#000000',
        labelFontSize: 14,
        labelOffset: '-2.5em',
        labelText: 'Data Volume (kB)',
        scaleDomain,
      },
    },
  };
}

export function getSimulationRunBands(): StringTMap<Band> {
  const simulationResults: SimulationResults = {
    resources: {
      a: [0, 1, 2, 3, 4],
      b: [1, 1, 2, 2, 2],
      c: [2, 2, 2, 1, 1],
      d: [1, 3, 1, 3, 1],
      e: [4, 2, 3, 1, 0],
    },
    times: [
      '2020-001T00:00:05',
      '2020-001T00:00:15',
      '2020-001T00:00:30',
      '2020-001T00:00:45',
      '2020-001T00:00:55',
    ],
  };
  const { resources, times } = simulationResults;

  const stateBands = Object.keys(resources).reduce((bands, resource) => {
    const values = resources[resource];
    const points: PointLine[] = values.map((y, index) => ({
      color: '#ffa459',
      id: `pointLine-${index}`,
      radius: 3,
      selected: false,
      type: 'line',
      x: getUnixEpochTime(times[index]),
      y,
    }));
    const subBands: SubBandLine[] = [
      {
        id: `subBandLine-${resource}`,
        points,
        type: 'line',
      },
    ];
    const id = `band-${resource}`;
    const band: Band = {
      height: 150,
      id,
      order: 0,
      subBands,
      yAxis: {
        labelFillColor: '#000000',
        labelFontSize: 14,
        labelOffset: '-2.5em',
        labelText: resource,
        scaleDomain: d3.extent(values),
      },
    };

    bands[id] = band;

    return bands;
  }, {});

  return stateBands;
}

export function getXRangeBand(
  plan: CPlan,
  pointCount: number = 4,
): StringTMap<Band> {
  const id = uniqueId('band');
  const start = getUnixEpochTime(plan.startTimestamp) + 1000;
  const end = getUnixEpochTime(plan.endTimestamp);
  const xStep = (end - start) / pointCount;

  const points: PointXRange[] = range(pointCount).map(i => {
    const x = start + xStep * i;
    return {
      color: '#f49542',
      duration: 8000,
      id: uniqueId('pointXRange'),
      labelFillColor: '#000000',
      labelFont: 'Georgia',
      labelFontSize: 12,
      labelText: 'FIXED',
      selected: false,
      type: 'x-range',
      x,
    };
  });

  const subBands: SubBandXRange[] = [
    {
      id: uniqueId('subBandXRange'),
      points,
      type: 'x-range',
    },
  ];

  return {
    [id]: {
      height: 150,
      id,
      order: 0,
      subBands,
      yAxis: {
        labelFillColor: '#000000',
        labelFontSize: 14,
        labelOffset: '-2.5em',
        labelText: 'Tracking Mode',
        scaleDomain: [],
      },
    },
  };
}
