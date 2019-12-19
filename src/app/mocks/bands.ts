import random from 'lodash-es/random';
import range from 'lodash-es/range';
import uniqueId from 'lodash-es/uniqueId';
import { getUnixEpochTime } from '../functions';
import { Band, CPlan, PointLine, SubBandLine } from '../types';

export function getLineBand(
  plan: CPlan,
  scaleDomain = [0, 4],
  pointCount: number = 100,
): Band {
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
    height: 200,
    id: uniqueId('band'),
    order: 0,
    subBands,
    yAxis: {
      labelFillColor: '#000000',
      labelFontSize: 14,
      labelOffset: '-2.5em',
      labelText: 'Data Volume (kB)',
      scaleDomain,
    },
  };
}
