import uniqueId from 'lodash-es/uniqueId';
import { Band, PointLine, SimulationResult, SubBandLine } from '../types';
import { getUnixEpochTime } from './time';

export function simulationResultsToBands(
  simulationResults: SimulationResult[],
): Band[] {
  return simulationResults.map(({ name, start, values }) => {
    const id = `simulation-result-${name}`;
    const yAxisId = uniqueId('axis');
    const points: PointLine[] = [];
    let minY = Number.MAX_SAFE_INTEGER;
    let maxY = Number.MIN_SAFE_INTEGER;

    for (let i = 0; i < values.length; ++i) {
      const { x, y } = values[i];
      points.push({
        id: `${id}-pointLine-${i}`,
        type: 'line',
        x: getUnixEpochTime(start) + x / 1000,
        y,
      });
      minY = y < minY ? y : minY;
      maxY = y > maxY ? y : maxY;
    }

    if (minY === maxY) {
      // If extents are equal, clip first extent to 0
      // so axis and line gets properly drawn by D3.
      minY = 0;
    }

    const subBands: SubBandLine[] = [
      {
        id: `${id}-subBandLine-${name}`,
        points,
        type: 'line',
        yAxisId,
      },
    ];

    const band: Band = {
      height: 260,
      id,
      subBands,
      type: 'simulation',
      yAxes: [
        {
          id: yAxisId,
          label: {
            text: name,
          },
          scaleDomain: [minY, maxY],
        },
      ],
    };

    return band;
  });
}
