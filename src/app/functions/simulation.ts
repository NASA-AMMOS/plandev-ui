import * as d3 from 'd3';
import {
  Band,
  PointLine,
  SimulationResults,
  StringTMap,
  SubBandLine,
} from '../types';
import { getUnixEpochTime } from './time';

export function simulationResultsToBands(
  simulationResults: SimulationResults,
): StringTMap<Band> {
  const { resources, times } = simulationResults;

  return Object.keys(resources).reduce((bands, resource) => {
    const values: (number | null | boolean)[] = resources[resource];
    const id = `band-${resource}`;
    const points: PointLine[] = values.reduce((acc, y, index) => {
      if (y !== null) {
        acc.push({
          color: '#ffa459',
          id: `${id}-pointLine-${index}`,
          radius: 3,
          selected: false,
          type: 'line',
          x: getUnixEpochTime(times[index]),
          y: y === true ? 1 : y === false ? 0 : y,
        });
      }
      return acc;
    }, []);
    const subBands: SubBandLine[] = [
      {
        id: `${id}-subBandLine-${resource}`,
        points,
        type: 'line',
      },
    ];
    const band: Band = {
      height: 260,
      id,
      order: 0,
      subBands,
      yAxis: {
        labelFillColor: '#000000',
        labelFontSize: 12,
        labelOffset: '-3.8em',
        labelText: resource,
        scaleDomain: d3.extent(values as number[]),
      },
    };

    bands[id] = band;

    return bands;
  }, {});
}
