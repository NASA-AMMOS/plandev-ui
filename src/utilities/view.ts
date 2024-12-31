import Ajv from 'ajv';
import { ViewDefaultDiscreteOptions, viewSchemaVersion, viewSchemaVersionName } from '../constants/view';
import jsonSchema from '../schemas';
import type { ActivityType } from '../types/activity';
import type { ExternalEventType } from '../types/external-event';
import type { ResourceType } from '../types/simulation';
import type { View, ViewDefinition, ViewGridColumns, ViewGridRows } from '../types/view';
import {
  createRow,
  createTimeline,
  createTimelineActivityLayer,
  createTimelineExternalEventLayer,
  createTimelineResourceLayer,
  isActivityLayer,
  isLineLayer,
  isXRangeLayer,
} from './timeline';

/**
 * Generates a default generic UI view.
 */
export function generateDefaultView(
  activityTypes: ActivityType[] = [],
  resourceTypes: ResourceType[] = [],
  externalEventTypes: ExternalEventType[] = [],
): View {
  const now = new Date().toISOString();
  const types: string[] = activityTypes.map(({ name }) => name);

  const timeline = createTimeline([], { marginLeft: 250, marginRight: 30 });
  const timelines = [timeline];

  // Start with the activity row
  const activityLayer = createTimelineActivityLayer(timelines, {
    filter: { activity: { static_types: types } },
  });
  const activityRow = createRow(timelines, {
    autoAdjustHeight: true,
    discreteOptions: { ...ViewDefaultDiscreteOptions, displayMode: 'grouped' },
    expanded: true,
    layers: [activityLayer],
    name: 'Activities by Type',
  });
  timeline.rows.push(activityRow);

  // IF derivation groups with event_types are associated, make an external event row
  // If there are empty derivation groups associated without any event types, this row is not added
  //    (to change this, modify getExternalEventTypes to include derivation groups as well in its
  //     return type, so they can be checked as well).
  if (externalEventTypes.length) {
    const externalEventLayer = createTimelineExternalEventLayer(timelines, {
      filter: { externalEvent: { event_types: externalEventTypes.map(e => e.name) } },
    });
    const externalEventRow = createRow(timelines, {
      autoAdjustHeight: false,
      discreteOptions: { ...ViewDefaultDiscreteOptions, displayMode: 'grouped' },
      expanded: true,
      height: 100,
      layers: [externalEventLayer],
      name: 'External Events',
    });
    timeline.rows.push(externalEventRow);
  }

  // Generate a row for every resource
  resourceTypes.map(resourceType => {
    const { layer, yAxis } = createTimelineResourceLayer(timelines, resourceType);
    const layers = layer ? [layer] : [];
    const resourceRow = createRow(timelines, {
      autoAdjustHeight: false,
      expanded: true,
      height: 100,
      layers,
      name: resourceType.name,
      yAxes: [yAxis],
    });

    timeline.rows.push(resourceRow);
  });

  return {
    created_at: now,
    definition: {
      plan: {
        activityDirectivesTable: {
          autoSizeColumns: 'fill',
          columnDefs: [
            {
              aggFunc: null,
              colId: 'arguments',
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
              field: 'id',
              filter: 'text',
              headerName: 'ID',
              resizable: true,
              sortable: true,
              width: 80,
            },
            {
              aggFunc: null,
              colId: 'last_modified_at',
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
              field: 'name',
              filter: 'text',
              headerName: 'Name',
              resizable: true,
              sortable: true,
              width: 200,
            },
            {
              field: 'type',
              filter: 'text',
              headerName: 'Type',
              resizable: true,
              sortable: true,
            },
            {
              aggFunc: null,
              colId: 'source_scheduling_goal_id',
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
              field: 'start_offset',
              filter: 'text',
              headerName: 'Start Offset',
              resizable: true,
              sortable: true,
            },
            {
              aggFunc: null,
              colId: 'tags',
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
              field: 'derived_start_time',
              filter: 'text',
              headerName: 'Absolute Start Time (UTC)',
              resizable: true,
              sortable: true,
              width: 200,
            },
            {
              aggFunc: null,
              colId: 'start_offset',
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
              field: 'created_at',
              filter: 'text',
              headerName: 'Created At (UTC)',
              hide: true,
              resizable: true,
              sortable: true,
              width: 200,
            },
          ],
          columnStates: [],
        },
        activitySpansTable: {
          autoSizeColumns: 'fill',
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
          leftComponentTop: 'TimelineItemsPanel',
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
        simulationEventsTable: {
          autoSizeColumns: 'fit',
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
              field: 'start_offset',
              filter: 'text',
              headerName: 'Start Offset',
              hide: true,
              resizable: true,
              sortable: true,
            },
            {
              field: 'dense_time',
              filter: 'text',
              headerName: 'Dense Time',
              hide: true,
              resizable: true,
              sortable: true,
            },
            {
              field: 'topic',
              filter: 'text',
              headerName: 'Topic',
              resizable: true,
              sortable: true,
            },
            {
              field: 'value',
              filter: 'text',
              headerName: 'Value',
              resizable: true,
              sortable: true,
            },
          ],
          columnStates: [],
        },
        timelines,
      },
      version: viewSchemaVersion,
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
    // Ensure json schema is found for the current version
    const currentSchema = (jsonSchema as Record<string, any>)[viewSchemaVersionName];
    if (!currentSchema) {
      throw new Error(`Schema not found for version: ${viewSchemaVersionName}`);
    }
    const validate = ajv.compile(currentSchema);
    const valid = validate(json);
    const errors = valid ? [] : validate.errors;
    return { errors, valid };
  } catch (e) {
    const { message } = e as Error;
    return { errors: [message], valid: false };
  }
}

export function downloadView(view: View) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(view.definition, null, 2)], { type: 'application/json' }));
  a.download = view.name;
  a.click();
}

export async function applyViewMigrations(view: View): Promise<{
  anyMigrationsApplied: boolean;
  error: Error | null;
  migratedView: View | null;
}> {
  try {
    const { anyMigrationsApplied, error, migratedViewDefinition } = await applyViewDefinitionMigrations(
      view.definition,
    );
    if (!migratedViewDefinition || error) {
      return { anyMigrationsApplied: false, error, migratedView: null };
    }
    const migratedView: View = { ...view, definition: migratedViewDefinition };
    return { anyMigrationsApplied, error, migratedView };
  } catch (error) {
    return { anyMigrationsApplied: false, error: error as Error, migratedView: null };
  }
}

export function applyViewDefinitionMigrations(viewDefinition: ViewDefinition): {
  anyMigrationsApplied: boolean;
  error: Error | null;
  migratedViewDefinition: ViewDefinition | null;
} {
  try {
    // If the view version does not exist we will consider it to be version 0
    const version = viewDefinition.version ?? 0;
    const upMigrations: Record<number, (view: ViewDefinition) => ViewDefinition> = {
      0: migrateViewDefinitionV0toV1,
      1: migrateViewDefinitionV1toV2,
    };

    // Iterate through versions between view version and latest view version
    // and apply any migrations if found
    let migratedViewDefinition = viewDefinition;
    let anyMigrationsApplied = false;
    for (let i = version; i < viewSchemaVersion; i++) {
      if (upMigrations[i]) {
        migratedViewDefinition = upMigrations[i](migratedViewDefinition);
        anyMigrationsApplied = true;
      }
    }

    return { anyMigrationsApplied, error: null, migratedViewDefinition };
  } catch (error) {
    return { anyMigrationsApplied: false, error: error as Error, migratedViewDefinition: null };
  }
}

export function migrateViewDefinitionV0toV1(viewDefinition: ViewDefinition) {
  /*
    Summary of migrations:
    - External events changes to row activity options
    - ActivityTypesPanel rename to TimelineItemsPanel
    - ConstraintViolationsPanel rename to ConstraintsPanel
    - Remove deprecated ActivityLayer.activityHeight
  */
  const updatedGrid = structuredClone(viewDefinition.plan.grid);
  const gridKeysToUpdate = [
    'leftComponentTop',
    'rightComponentTop',
    'leftComponentBottom',
    'rightComponentBottom',
    'middleComponentBottom',
  ];
  const gridKeysToSwap: Record<string, string> = {
    ActivityTypesPanel: 'TimelineItemsPanel',
    ConstraintViolationsPanel: 'ConstraintsPanel',
  };
  Object.entries(updatedGrid).forEach(([key, value]) => {
    if (gridKeysToUpdate.indexOf(key) > -1 && gridKeysToSwap[value as string]) {
      // @ts-expect-error cannot resolve types here but this is safe
      updatedGrid[key] = gridKeysToSwap[value];
    }
    return value;
  });

  return {
    ...viewDefinition,
    plan: {
      ...viewDefinition.plan,
      grid: updatedGrid,
      timelines: viewDefinition.plan.timelines.map(timeline => {
        return {
          ...timeline,
          rows: timeline.rows.map(row => {
            const newRow = structuredClone(row);
            // @ts-expect-error deprecated type def
            if (row.activityOptions) {
              newRow.discreteOptions = {
                ...(newRow.discreteOptions ?? {}),
                activityOptions: {
                  // @ts-expect-error deprecated type def
                  composition: newRow.activityOptions.composition,
                  // @ts-expect-error deprecated type def
                  hierarchyMode: newRow.activityOptions.hierarchyMode,
                },
                // @ts-expect-error deprecated type def
                displayMode: newRow.activityOptions.displayMode,
                externalEventOptions: {
                  groupBy: 'event_type_name',
                },
                // @ts-expect-error deprecated type def
                height: newRow.activityOptions.activityHeight,
                // @ts-expect-error deprecated type def
                labelVisibility: newRow.activityOptions.labelVisibility,
              };
              // @ts-expect-error deprecated type def
              delete newRow.activityOptions;
            }
            newRow.layers = newRow.layers.map(layer => {
              const newLayer = structuredClone(layer);
              if (newLayer.chartType === 'activity') {
                // @ts-expect-error deprecated type def
                delete newLayer.activityHeight;
              }
              return newLayer;
            });
            return newRow;
          }),
        };
      }),
    },
    version: 1,
  };
}

export function migrateViewDefinitionV1toV2(viewDefinition: ViewDefinition) {
  /*
    Summary of migrations:
    - Activity layer filter types list changes to new complex set of filters
    - Resource layer filter names list changes to a single type string
  */
  return {
    ...viewDefinition,
    plan: {
      ...viewDefinition.plan,
      timelines: viewDefinition.plan.timelines.map(timeline => {
        return {
          ...timeline,
          rows: timeline.rows.map(row => {
            const newRow = structuredClone(row);
            newRow.layers = newRow.layers.map(layer => {
              if (isActivityLayer(layer)) {
                // @ts-expect-error deprecated type def
                if (layer.filter.activity?.types && Array.isArray(layer.filter.activity.types)) {
                  // @ts-expect-error deprecated type def
                  layer.filter.activity.static_types = [...layer.filter.activity.types];

                  // @ts-expect-error deprecated type def
                  delete layer.filter.activity.types;
                }
              } else if (isLineLayer(layer) || isXRangeLayer(layer)) {
                // @ts-expect-error deprecated type def
                const resourceNames = layer.filter.resource?.names;
                if (resourceNames && Array.isArray(resourceNames) && typeof resourceNames[0] === 'string') {
                  layer.filter.resource = resourceNames[0];
                } else {
                  delete layer.filter.resource;
                }
              }
              return layer;
            });
            return newRow;
          }),
        };
      }),
    },
    version: 2,
  };
}
