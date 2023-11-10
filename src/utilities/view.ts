import Ajv from 'ajv';
import jsonSchema from '../schemas/ui-view-schema.json';
import type { ActivityType } from '../types/activity';
import type { ResourceType } from '../types/simulation';
import type { Layer } from '../types/timeline';
import type { View, ViewGridColumns, ViewGridRows } from '../types/view';
import {
  createRow,
  createTimeline,
  createTimelineActivityLayer,
  createTimelineLineLayer,
  createTimelineXRangeLayer,
  createYAxis,
} from './timeline';

/**
 * Generates a default generic UI view.
 */
export function generateDefaultView(activityTypes: ActivityType[] = [], resourceTypes: ResourceType[] = []): View {
  const now = new Date().toISOString();
  const types: string[] = activityTypes.map(({ name }) => name);

  const timeline = createTimeline([], { marginLeft: 160, marginRight: 30 });
  const timelines = [timeline];

  const activityLayer = createTimelineActivityLayer(timelines, {
    filter: { activity: { types } },
  });
  const activityRow = createRow(timelines, {
    autoAdjustHeight: false,
    expanded: true,
    height: 200,
    layers: [activityLayer],
    name: 'Activities',
  });
  timeline.rows.push(activityRow);

  // Generate a row for every resource
  resourceTypes.map(resourceType => {
    const { name, schema } = resourceType;
    const { type: schemaType } = schema;
    const unit = schema.metadata?.unit?.value;
    const isDiscreteSchema = schemaType === 'boolean' || schemaType === 'string' || schemaType === 'variant';
    const isNumericSchema =
      schemaType === 'int' ||
      schemaType === 'real' ||
      (schemaType === 'struct' && schema?.items?.rate?.type === 'real' && schema?.items?.initial?.type === 'real');

    const yAxis = createYAxis(timelines, {
      label: { text: `${name}${unit ? ` (${unit})` : ''}` },
      tickCount: isNumericSchema ? 5 : 0,
    });

    const resourceLayers = isDiscreteSchema
      ? ([createTimelineXRangeLayer(timelines, [yAxis], { filter: { resource: { names: [name] } } })] as Layer[])
      : isNumericSchema
      ? ([createTimelineLineLayer(timelines, [yAxis], { filter: { resource: { names: [name] } } })] as Layer[])
      : ([] as Layer[]);

    const resourceRow = createRow(timelines, {
      autoAdjustHeight: false,
      expanded: true,
      height: 100,
      layers: resourceLayers,
      name,
      yAxes: [yAxis],
    });

    timeline.rows.push(resourceRow);
  });

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
              field: 'derived_start_time',
              filter: 'text',
              headerName: 'Absolute Start Time',
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
              width: 80,
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
              colId: 'applied_preset',
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
              colId: 'derived_start_time',
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
              field: 'derived_start_time',
              filter: 'text',
              headerName: 'Absolute Start Time',
              hide: false,
              resizable: true,
              sortable: true,
            },
            {
              field: 'derived_end_time',
              filter: 'text',
              headerName: 'Absolute End Time',
              hide: false,
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
        timelines,
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

export function validateViewJSONAgainstSchema(json: any) {
  try {
    const ajv = new Ajv();
    const validate = ajv.compile(jsonSchema);
    const valid = validate(json);
    const errors = valid ? [] : validate.errors;
    return { errors, valid };
  } catch (e) {
    const { message } = e as Error;
    return { errors: [message], valid: false };
  }
}
