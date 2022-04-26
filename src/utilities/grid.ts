/**
 * Grid constants for use in updating the view layout.
 */

export const activitiesGrid: Grid = {
  columnSizes: '1fr 3px 2fr 3px 1fr',
  columns: [
    { componentName: 'ActivityForm', id: 1, type: 'component' },
    { id: 2, track: 1, type: 'gutter' },
    {
      id: 3,
      rowSizes: '70% 3px 1fr',
      rows: [
        { componentName: 'Timeline', id: 4, timelineId: 0, type: 'component' },
        { id: 5, track: 1, type: 'gutter' },
        { activityTableId: 0, componentName: 'ActivityTable', id: 6, type: 'component' },
      ],
      type: 'rows',
    },
    { id: 7, track: 3, type: 'gutter' },
    { componentName: 'ActivityTypes', id: 8, type: 'component' },
  ],
  gridName: 'Activities',
  id: 0,
  type: 'columns',
};

export const constraintsGrid: Grid = {
  columnSizes: '1fr 3px 2fr 3px 1fr',
  columns: [
    { componentName: 'ConstraintEditor', id: 1, type: 'component' },
    { id: 2, track: 1, type: 'gutter' },
    {
      id: 3,
      rowSizes: '70% 3px 30%',
      rows: [
        { componentName: 'Timeline', id: 4, timelineId: 0, type: 'component' },
        { id: 5, track: 1, type: 'gutter' },
        { activityTableId: 0, componentName: 'ActivityTable', id: 6, type: 'component' },
      ],
      type: 'rows',
    },
    { id: 7, track: 3, type: 'gutter' },
    {
      id: 8,
      rowSizes: '50% 3px 50%',
      rows: [
        { componentName: 'Constraints', id: 9, type: 'component' },
        { id: 10, track: 1, type: 'gutter' },
        { componentName: 'ConstraintViolations', id: 11, type: 'component' },
      ],
      type: 'rows',
    },
  ],
  gridName: 'Constraints',
  id: 0,
  type: 'columns',
};

export const schedulingGrid: Grid = {
  columnSizes: '1fr 3px 2fr 3px 1fr',
  columns: [
    { componentName: 'SchedulingEditor', id: 1, type: 'component' },
    { id: 2, track: 1, type: 'gutter' },
    {
      id: 3,
      rowSizes: '70% 3px 1fr',
      rows: [
        { componentName: 'Timeline', id: 4, timelineId: 0, type: 'component' },
        { id: 5, track: 1, type: 'gutter' },
        { activityTableId: 0, componentName: 'ActivityTable', id: 6, type: 'component' },
      ],
      type: 'rows',
    },
    { id: 7, track: 3, type: 'gutter' },
    { componentName: 'Scheduling', id: 8, type: 'component' },
  ],
  gridName: 'Scheduling',
  id: 0,
  type: 'columns',
};

export const simulationGrid: Grid = {
  columnSizes: '3fr 3px 1fr',
  columns: [
    {
      id: 1,
      rowSizes: '70% 3px 1fr',
      rows: [
        { componentName: 'Timeline', id: 2, timelineId: 0, type: 'component' },
        { id: 3, track: 1, type: 'gutter' },
        { activityTableId: 0, componentName: 'ActivityTable', id: 4, type: 'component' },
      ],
      type: 'rows',
    },
    { id: 5, track: 1, type: 'gutter' },
    { componentName: 'Simulation', id: 6, type: 'component' },
  ],
  gridName: 'Simulation',
  id: 0,
  type: 'columns',
};

export const timelineGrid: Grid = {
  columnSizes: '3fr 3px 1fr',
  columns: [
    { componentName: 'Timeline', id: 1, timelineId: 0, type: 'component' },
    { id: 2, track: 1, type: 'gutter' },
    { componentName: 'TimelineForm', id: 3, type: 'component' },
  ],
  gridName: 'Timeline',
  id: 0,
  type: 'columns',
};

export const viewsGrid: Grid = {
  columnSizes: '1fr 3px 2fr 3px 1fr',
  columns: [
    { componentName: 'ViewEditor', id: 1, type: 'component' },
    { id: 2, track: 1, type: 'gutter' },
    {
      id: 3,
      rowSizes: '70% 3px 1fr',
      rows: [
        { componentName: 'Timeline', id: 4, timelineId: 0, type: 'component' },
        { id: 5, track: 1, type: 'gutter' },
        { activityTableId: 0, componentName: 'ActivityTable', id: 6, type: 'component' },
      ],
      type: 'rows',
    },
    { id: 7, track: 3, type: 'gutter' },
    { componentName: 'Views', id: 8, type: 'component' },
  ],
  gridName: 'Views',
  id: 0,
  type: 'columns',
};

/**
 * Grid utility functions.
 */

/**
 * Recursively updates a grid prop/value by id.
 */
export function updateGrid(grid: Grid, id: number, prop: string, value: any): Grid {
  if (grid.type === 'component' && grid.id === id) {
    grid[prop] = value;
    return grid;
  }

  if (grid.type === 'columns') {
    if (id === grid.id) {
      grid[prop] = value;
      return grid;
    }

    grid.columns.map(column => {
      if (column.type === 'columns' && id === column.id) {
        column[prop] = value;
        return column;
      } else {
        return updateGrid(column, id, prop, value);
      }
    });
  }

  if (grid.type === 'rows') {
    if (id === grid.id) {
      grid[prop] = value;
      return grid;
    }

    grid.rows.map(row => {
      if (row.type === 'rows' && id === row.id) {
        row[prop] = value;
        return row;
      } else {
        return updateGrid(row, id, prop, value);
      }
    });
  }

  return grid;
}
