import type { ActivityType } from '../types/activity';
import type { ResourceType } from '../types/simulation';
import type { ActivityLayer, Axis, LineLayer, Row, XRangeLayer } from '../types/timeline';
import type { View, ViewGridColumns, ViewGridRows } from '../types/view';

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
        activityDirectivesTable: {
          columnDefs: [
            {
              field: 'id',
              filter: 'text',
              headerName: 'ID',
              resizable: true,
              sortable: true,
            },
            {
              field: 'name',
              filter: 'text',
              headerName: 'Name',
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
              field: 'start_offset',
              filter: 'text',
              headerName: 'Start Offset',
              resizable: true,
              sortable: true,
            },
            {
              field: 'created_at',
              filter: 'text',
              headerName: 'Created At',
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
              hide: false,
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
            {
              aggFunc: null,
              colId: 'anchor_id',
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
              colId: 'anchored_to_start',
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
              colId: 'start_offset',
              flex: null,
              hide: false,
              pinned: null,
              pivot: false,
              pivotIndex: null,
              rowGroup: false,
              rowGroupIndex: null,
              sort: null,
              sortIndex: null,
              width: 200,
            },
          ],
        },
        activitySpansTable: {
          columnDefs: [
            {
              field: 'id',
              filter: 'text',
              headerName: 'ID',
              resizable: true,
              sortable: true,
            },
            {
              field: 'dataset_id',
              filter: 'text',
              headerName: 'Dataset ID',
              resizable: true,
              sortable: true,
            },
            {
              field: 'parent_id',
              filter: 'text',
              headerName: 'Parent ID',
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
              field: 'start_offset',
              filter: 'text',
              headerName: 'Start Offset',
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
          columnStates: [],
        },
        grid: {
          columnSizes: '1fr 3px 3fr 3px 1fr',
          leftComponentBottom: 'SimulationPanel',
          leftComponentTop: 'ActivityTypesPanel',
          leftHidden: false,
          leftRowSizes: '1fr',
          leftSplit: false,
          middleComponentBottom: 'ActivityDirectivesTablePanel',
          middleRowSizes: '2fr 3px 1fr',
          middleSplit: true,
          rightComponentBottom: 'TimelineEditorPanel',
          rightComponentTop: 'ActivityFormPanel',
          rightHidden: false,
          rightRowSizes: '1fr',
          rightSplit: false,
        },
        iFrames: [
          {
            id: 0,
            src: 'https://eyes.nasa.gov/apps/mars2020/#/home',
            title: 'Mars-2020-EDL',
          },
        ],
        timelines: [
          {
            id: 0,
            marginLeft: 110,
            marginRight: 30,
            rows: [
              {
                autoAdjustHeight: false,
                expanded: true,
                height: 200,
                horizontalGuides: [],
                id: rowIds++,
                layers: [
                  {
                    activityColor: '#fcdd8f',
                    activityHeight: 16,
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

export function parseColumnSizes(
  columnSizes = '1fr 3px 3fr 3px 1fr',
  leftHidden: boolean,
  rightHidden: boolean,
): ViewGridColumns | null {
  if (!leftHidden && !rightHidden) {
    const matches = columnSizes.match(
      new RegExp(`^(?<col1>\\S+)\\s(!?\\S+)\\s(?<col2>\\S+)\\s(!?\\S+)\\s(?<col3>\\S+)$`, 'i'),
    );
    if (matches) {
      const { groups: { col1, col2, col3 } = {} } = matches;
      return {
        col1,
        col2,
        col3,
      };
    }
  } else if (leftHidden && rightHidden) {
    const matches = columnSizes.match(new RegExp(`^\\s(?<col2>\\S+)$`, 'i'));
    if (matches) {
      const { groups: { col2 } = {} } = matches;
      return {
        col2,
      };
    }
  } else if (!leftHidden && rightHidden) {
    const matches = columnSizes.match(new RegExp(`^(?<col1>\\S+)\\s(?!\\S+)\\s(?<col2>\\S+)$`, 'i'));
    if (matches) {
      const { groups: { col1, col2 } = {} } = matches;
      return {
        col1,
        col2,
      };
    }
  } else if (leftHidden && !rightHidden) {
    const matches = columnSizes.match(new RegExp(`^(?<col2>\\S+)\\s(?!\\S+)\\s(?<col3>\\S+)$`, 'i'));
    if (matches) {
      const { groups: { col2, col3 } = {} } = matches;
      return {
        col2,
        col3,
      };
    }
  }

  return {
    col1: '1fr',
    col2: '3fr',
    col3: '1fr',
  };
}

export function createColumnSizes(
  { col1 = '1fr', col2 = '3fr', col3 = '1fr' }: ViewGridColumns,
  leftHidden: boolean,
  rightHidden: boolean,
): string {
  const gutterSize = '3px';

  if (leftHidden && rightHidden) {
    return col2;
  } else if (!leftHidden && rightHidden) {
    return `${col1} ${gutterSize} ${col2}`;
  } else if (leftHidden && !rightHidden) {
    return `${col2} ${gutterSize} ${col3}`;
  }

  return `${col1} ${gutterSize} ${col2} ${gutterSize} ${col3}`;
}

export function createRowSizes({ row1 = '1fr', row2 = '1fr' }: ViewGridRows, colSplit: boolean): string {
  const gutterSize = '3px';
  if (colSplit) {
    return `${row1} ${gutterSize} ${row2}`;
  }

  return '1fr';
}
