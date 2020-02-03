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
    const values = resources[resource];
    const id = `band-${resource}`;
    const points: PointLine[] = values.map((y, index) => ({
      color: '#ffa459',
      id: `${id}-pointLine-${index}`,
      radius: 3,
      selected: false,
      type: 'line',
      x: getUnixEpochTime(times[index]),
      y,
    }));
    const subBands: SubBandLine[] = [
      {
        id: `${id}-subBandLine-${resource}`,
        points,
        type: 'line',
      },
    ];
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
}
