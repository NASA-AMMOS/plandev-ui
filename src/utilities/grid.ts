/**
 * Grid constants for use in updating the view layout.
 */

export const activitiesGrid: Grid = {
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
  gridName: 'Activities',
  id: 0,
  type: 'columns',
};

export const constraintsGrid: Grid = {
  columnSizes: '1fr 3px 3fr 3px 1fr',
  columns: [
    { componentName: 'ConstraintsPanel', id: 1, type: 'component' },
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
        { componentName: 'ConstraintViolationsPanel', id: 11, type: 'component' },
      ],
      type: 'rows',
    },
  ],
  gridName: 'Constraints',
  id: 0,
  type: 'columns',
};

export const schedulingGrid: Grid = {
  columnSizes: '1fr 3px 3fr 3px 1fr',
  columns: [
    { componentName: 'SchedulingPanel', id: 1, type: 'component' },
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
  gridName: 'Scheduling',
  id: 0,
  type: 'columns',
};

export const simulationGrid: Grid = {
  columnSizes: '1fr 3px 3fr 3px 1fr',
  columns: [
    { componentName: 'SimulationPanel', id: 1, type: 'component' },
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
  gridName: 'Simulation',
  id: 0,
  type: 'columns',
};

/**
 * Grid utility functions.
 */

/**
 * Recursively updates a grid prop/value by id.
 */
export function updateGrid(grid: Grid, id: number, update: Record<string, any>): Grid {
  if (grid.type === 'component' && grid.id === id) {
    return { ...grid, ...update };
  }

  if (grid.type === 'columns') {
    if (id === grid.id) {
      return { ...grid, ...update };
    }

    return {
      ...grid,
      columns: grid.columns.map(column => {
        if (column.type === 'columns' && id === column.id) {
          return { ...column, ...update };
        } else {
          return updateGrid(column, id, update);
        }
      }),
    };
  }

  if (grid.type === 'rows') {
    if (id === grid.id) {
      return { ...grid, ...update };
    }

    return {
      ...grid,
      rows: grid.rows.map(row => {
        if (row.type === 'rows' && id === row.id) {
          return { ...row, ...update };
        } else {
          return updateGrid(row, id, update);
        }
      }),
    };
  }

  return grid;
}
