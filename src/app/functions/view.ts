import {
  ActivityLayer,
  LineLayer,
  View,
  ViewSection,
  XRangeLayer,
} from '../types';

/**
 * Returns a JSON string of a view that the user can edit.
 * It removes properties that should not be editable.
 */
export function getViewText(view: View): string {
  const newView = {
    name: view.name,
    sections: view.sections.map((section: ViewSection) => {
      if (section.timeline) {
        return {
          ...section,
          timeline: {
            ...section.timeline,
            rows: section.timeline.rows.map(row => {
              row = { ...row };

              return {
                ...row,
                layers: row.layers.map(
                  (layer: ActivityLayer | LineLayer | XRangeLayer) => {
                    layer = { ...layer };

                    delete layer.points;
                    delete (layer as LineLayer).curveType;
                    delete (layer as XRangeLayer).domain;

                    return layer;
                  },
                ),
              };
            }),
          },
        };
      }
      return section;
    }),
  };
  return JSON.stringify(newView, null, 2);
}
