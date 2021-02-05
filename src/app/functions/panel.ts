import { ActivityLayer, LineLayer, Panel, XRangeLayer } from '../types';

export function getPanelsText(panels: Panel[]): string {
  panels = panels.map(panel => {
    if (panel.timeline) {
      return {
        ...panel,
        timeline: {
          ...panel.timeline,
          rows: panel.timeline.rows.map(row => {
            row = { ...row };

            return {
              ...row,
              layers: row.layers.map(
                (layer: ActivityLayer | LineLayer | XRangeLayer) => {
                  layer = { ...layer };

                  delete layer.points;
                  delete (layer as XRangeLayer).domain;

                  return layer;
                },
              ),
            };
          }),
        },
      };
    }
    return panel;
  });
  return JSON.stringify(panels, null, 2);
}
