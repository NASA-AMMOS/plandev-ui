import * as d3 from 'd3';
import uniqueId from 'lodash-es/uniqueId';
import { Band, PointLine, SimulationResult, SubBandLine } from '../types';
import { getUnixEpochTime } from './time';

export function simulationResultsToBands(
  simulationResults: SimulationResult[],
): Band[] {
  return simulationResults.map(({ name, start, values }) => {
    const id = uniqueId('band');
    const yAxisId = uniqueId('axis');

    const points: PointLine[] = values.map(({ x, y }, i) => ({
      id: `${id}-pointLine-${i}`,
      type: 'line',
      x: getUnixEpochTime(start) + x / 1000,
      y,
    }));

    const yValues = points.map(point => point.y);

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
          scaleDomain: d3.extent(yValues),
        },
      ],
    };

    return band;
  });
}
