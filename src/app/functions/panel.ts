import { Panel, SubBandWithPoints } from '../types';

export function getPanelsText(panels: Panel[]): string {
  panels = panels.map(panel => {
    if (panel.bands) {
      return {
        ...panel,
        bands: panel.bands.map(band => {
          band = { ...band };

          return {
            ...band,
            subBands: band.subBands.map((subBand: SubBandWithPoints) => {
              subBand = { ...subBand };

              if (subBand.points) {
                delete subBand.points;
              }

              return subBand;
            }),
          };
        }),
      };
    }
    return panel;
  });
  return JSON.stringify(panels, null, 2);
}
