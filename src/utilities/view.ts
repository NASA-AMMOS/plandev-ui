import type { ActivityType } from '../types/activity';
import type { ResourceType } from '../types/simulation';
import type { ActivityLayer, Axis, LineLayer, Row, XRangeLayer } from '../types/timeline';
import type { View } from '../types/view';

/**
 * Generates a default generic UI view.
 */
export function generateDefaultView(activityTypes: ActivityType[] = [], resourceTypes: ResourceType[] = []): View {
  const now = new Date().toISOString();
  const types: string[] = activityTypes.map(({ name }) => name);
  let rowIds = 0;
  let layerIds = 0;
  let yAxisIds = 0;

  return {
    created_at: now,
    definition: {
      plan: {
        activityTables: [
          {
            columnDefs: [
              {
                field: 'id',
                filter: 'text',
                headerName: 'ID',
                resizable: true,
                sortable: true,
              },
              {
                field: 'type',
                filter: 'text',
                headerName: 'Type',
                resizable: true,
                sortable: true,
              },
              {
                field: 'start_time_doy',
                filter: 'text',
                headerName: 'Start Time',
                resizable: true,
                sortable: true,
              },
              {
                field: 'duration',
                filter: 'text',
                headerName: 'Duration',
                resizable: true,
                sortable: true,
              },
            ],
            columnStates: [
              {
                aggFunc: null,
                colId: 'arguments',
                flex: null,
                hide: true,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 200,
              },
              {
                aggFunc: null,
                colId: 'created_at',
                flex: null,
                hide: true,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 200,
              },
              {
                aggFunc: null,
                colId: 'duration',
                flex: null,
                hide: false,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 281.3900000000001,
              },
              {
                aggFunc: null,
                colId: 'id',
                flex: null,
                hide: false,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 280,
              },
              {
                aggFunc: null,
                colId: 'last_modified_at',
                flex: null,
                hide: true,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 200,
              },
              {
                aggFunc: null,
                colId: 'metadata',
                flex: null,
                hide: true,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 200,
              },
              {
                aggFunc: null,
                colId: 'name',
                flex: null,
                hide: true,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 200,
              },
              {
                aggFunc: null,
                colId: 'source_scheduling_goal_id',
                flex: null,
                hide: true,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 200,
              },
              {
                aggFunc: null,
                colId: 'start_time_doy',
                flex: null,
                hide: false,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 280,
              },
              {
                aggFunc: null,
                colId: 'tags',
                flex: null,
                hide: true,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 200,
              },
              {
                aggFunc: null,
                colId: 'type',
                flex: null,
                hide: false,
                pinned: null,
                pivot: false,
                pivotIndex: null,
                rowGroup: false,
                rowGroupIndex: null,
                sort: null,
                sortIndex: null,
                width: 280,
              },
            ],
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
            { componentName: 'ActivityFormPanel', id: 8, type: 'component' },
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
                height: 100,
                horizontalGuides: [],
                id: rowIds++,
                layers: [
                  {
                    activityColor: '#283593',
                    activityHeight: 20,
                    chartType: 'activity',
                    filter: { activity: { types } },
                    id: layerIds++,
                    yAxisId: null,
                  } as ActivityLayer,
                ],
                name: 'Activities',
                yAxes: [],
              },
              ...resourceTypes.map(resourceType => {
                const { name, schema } = resourceType;
                const { type: schemaType } = schema;
                const isDiscreteSchema =
                  schemaType === 'boolean' || schemaType === 'string' || schemaType === 'variant';
                const isNumericSchema =
                  schemaType === 'int' ||
                  schemaType === 'real' ||
                  (schemaType === 'struct' &&
                    schema?.items?.rate?.type === 'real' &&
                    schema?.items?.initial?.type === 'real');

                const yAxis: Axis = {
                  color: '#000000',
                  id: yAxisIds++,
                  label: { text: name },
                  scaleDomain: isNumericSchema ? [-6, 6] : [],
                  tickCount: isNumericSchema ? 5 : 0,
                };

                const row: Row = {
                  autoAdjustHeight: false,
                  expanded: true,
                  height: 100,
                  horizontalGuides: [],
                  id: rowIds++,
                  layers: isDiscreteSchema
                    ? [
                        {
                          chartType: 'x-range',
                          colorScheme: 'schemeTableau10',
                          filter: { resource: { names: [name] } },
                          id: layerIds++,
                          opacity: 0.8,
                          yAxisId: yAxis.id,
                        } as XRangeLayer,
                      ]
                    : isNumericSchema
                    ? [
                        {
                          chartType: 'line',
                          filter: { resource: { names: [name] } },
                          id: layerIds++,
                          lineColor: '#283593',
                          lineWidth: 1,
                          pointRadius: 2,
                          yAxisId: yAxis.id,
                        } as LineLayer,
                      ]
                    : [],
                  name,
                  yAxes: [yAxis],
                };

                return row;
              }),
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
