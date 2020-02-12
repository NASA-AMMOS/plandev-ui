import * as d3 from 'd3';
import uniqueId from 'lodash-es/uniqueId';
import {
  Axis,
  Band,
  PointLine,
  SimulationResults,
  StringTMap,
  SubBand,
  SubBandLine,
} from '../types';
import { getRandomHexColor } from './band';
import { getUnixEpochTime } from './time';

export function simulationResultsToBands(
  simulationResults: SimulationResults,
  overlay: boolean = true,
): StringTMap<Band> {
  const { resources, times } = simulationResults;

  const bandsMap = Object.keys(resources).reduce((bands, resource) => {
    const values: (number | null | boolean)[] = resources[resource];
    const id = uniqueId('band');
    const color = getRandomHexColor();
    const points: PointLine[] = values.reduce((acc, y, index) => {
      if (y !== null) {
        acc.push({
          color,
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
    const yAxisId = uniqueId('axis');
    const subBands: SubBandLine[] = [
      {
        color,
        id: `${id}-subBandLine-${resource}`,
        interpolationType: 'curveMonotoneX',
        points,
        type: 'line',
        yAxisId,
      },
    ];
    const band: Band = {
      height: 260,
      id,
      order: 0,
      subBands,
      yAxes: [
        {
          color,
          id: yAxisId,
          labelFillColor: color,
          labelFontSize: 12,
          labelOffset: '-3.8em',
          labelText: resource,
          scaleDomain: d3.extent(values as number[]),
          tickCount: 5,
        },
      ],
    };

    bands[id] = band;

    return bands;
  }, {});

  if (overlay) {
    const id = uniqueId('band');
    const bands: Band[] = Object.values(bandsMap);
    return {
      [id]: {
        height: 260,
        id,
        order: 0,
        subBands: bands.reduce((subBands: SubBand[], band: Band) => {
          subBands.push(...band.subBands);
          return subBands;
        }, []),
        yAxes: bands.reduce((yAxes: Axis[], band: Band) => {
          yAxes.push(...band.yAxes);
          return yAxes;
        }, []),
      },
    };
  } else {
    return bandsMap;
  }
}
