import type { ActivityLayer } from '../types/timeline';
import type { View } from '../types/view';

/**
 * Generates a default generic UI view.
 * @todo Generate default rows based on resources.
 */
export function generateDefaultView(): View {
  const now = new Date().toISOString();
  return {
    created_at: now,
    definition: {
      plan: {
        activityTables: [
          {
            columnDefs: [
              { field: 'id', filter: 'text', headerName: 'ID', resizable: true, sortable: true },
              { field: 'type', filter: 'text', headerName: 'Type', resizable: true, sortable: true },
              {
                field: 'start_time_doy',
                filter: 'text',
                headerName: 'Start Time',
                resizable: true,
                sortable: true,
              },
              { field: 'duration', filter: 'text', headerName: 'Duration', resizable: true, sortable: true },
            ],
            columnStates: [],
            id: 0,
          },
        ],
        iFrames: [
          {
            id: 0,
            src: 'https://eyes.nasa.gov/apps/mars2020/#/home',
            title: 'Mars-2020-EDL',
          },
        ],
        layout: {
          columnSizes: '1fr 3px 3fr 3px 1fr',
          columns: [
            { componentName: 'ActivityTypesPanel', id: 1, type: 'component' },
            { id: 2, track: 1, type: 'gutter' },
            {
              id: 3,
              rowSizes: '2fr 3px 1fr',
              rows: [
                { componentName: 'TimelinePanel', id: 4, timelineId: 0, type: 'component' },
                { id: 5, track: 1, type: 'gutter' },
                { activityTableId: 0, componentName: 'ActivityTablePanel', id: 6, type: 'component' },
              ],
              type: 'rows',
            },
            { id: 7, track: 3, type: 'gutter' },
            {
              id: 8,
              rowSizes: '1fr 3px 1fr',
              rows: [
                { componentName: 'ActivityFormPanel', id: 9, type: 'component' },
                { id: 10, track: 1, type: 'gutter' },
                { componentName: 'TimelineEditorPanel', id: 11, type: 'component' },
              ],
              type: 'rows',
            },
          ],
          gridName: 'View',
          id: 0,
          type: 'columns',
        },
        timelines: [
          {
            id: 0,
            marginLeft: 110,
            marginRight: 30,
            rows: [
              {
                autoAdjustHeight: true,
                expanded: true,
                height: 200,
                horizontalGuides: [],
                id: 0,
                layers: [
                  {
                    activityColor: '#283593',
                    activityHeight: 20,
                    chartType: 'activity',
                    filter: { activity: { type: '.*' } },
                    id: 0,
                    yAxisId: null,
                  } as ActivityLayer,
                ],
                name: 'Activity Timeline',
                yAxes: [],
              },
            ],
            verticalGuides: [],
          },
        ],
      },
    },
    id: 0,
    name: 'Default View',
    owner: 'system',
    updated_at: now,
  };
}
