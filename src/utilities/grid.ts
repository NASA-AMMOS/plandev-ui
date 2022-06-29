/**
 * Grid constants for use in updating the view layout.
 */

export const activitiesGrid: Grid = {
  columnSizes: '1fr 3px 3fr 3px 1fr',
  columns: [
    { componentName: 'ActivityTypes', id: 1, type: 'component' },
    { id: 2, track: 1, type: 'gutter' },
    {
      id: 3,
      rowSizes: '2fr 3px 1fr',
      rows: [
        { componentName: 'Timeline', id: 4, timelineId: 0, type: 'component' },
        { id: 5, track: 1, type: 'gutter' },
        { activityTableId: 0, componentName: 'ActivityTable', id: 6, type: 'component' },
      ],
      type: 'rows',
    },
    { id: 7, track: 3, type: 'gutter' },
    { componentName: 'ActivityForm', id: 8, type: 'component' },
  ],
  gridName: 'Activities',
  id: 0,
  type: 'columns',
};

export const constraintsGrid: Grid = {
  columnSizes: '1fr 3px 3fr 3px 1fr',
  columns: [
    {
      id: 1,
      rowSizes: '1fr 3px 1fr',
      rows: [
        { componentName: 'Constraints', id: 2, type: 'component' },
        { id: 3, track: 1, type: 'gutter' },
        { componentName: 'ConstraintEditor', id: 4, type: 'component' },
      ],
      type: 'rows',
    },
    { id: 5, track: 1, type: 'gutter' },
    {
      id: 6,
      rowSizes: '2fr 3px 1fr',
      rows: [
        { componentName: 'Timeline', id: 7, timelineId: 0, type: 'component' },
        { id: 8, track: 1, type: 'gutter' },
        { activityTableId: 0, componentName: 'ActivityTable', id: 9, type: 'component' },
      ],
      type: 'rows',
    },
    { id: 10, track: 3, type: 'gutter' },
    {
      id: 11,
      rowSizes: '1fr 3px 1fr',
      rows: [
        { componentName: 'ActivityForm', id: 12, type: 'component' },
        { id: 13, track: 1, type: 'gutter' },
        { componentName: 'ConstraintViolations', id: 14, type: 'component' },
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
    { componentName: 'Scheduling', id: 1, type: 'component' },
    { id: 2, track: 1, type: 'gutter' },
    {
      id: 3,
      rowSizes: '2fr 3px 1fr',
      rows: [
        { componentName: 'Timeline', id: 4, timelineId: 0, type: 'component' },
        { id: 5, track: 1, type: 'gutter' },
        { activityTableId: 0, componentName: 'ActivityTable', id: 6, type: 'component' },
      ],
      type: 'rows',
    },
    { id: 7, track: 3, type: 'gutter' },
    { componentName: 'ActivityForm', id: 8, type: 'component' },
  ],
  gridName: 'Scheduling',
  id: 0,
  type: 'columns',
};

export const simulationGrid: Grid = {
  columnSizes: '1fr 3px 3fr 3px 1fr',
  columns: [
    { componentName: 'Simulation', id: 1, type: 'component' },
    { id: 2, track: 1, type: 'gutter' },
    {
      id: 3,
      rowSizes: '2fr 3px 1fr',
      rows: [
        { componentName: 'Timeline', id: 4, timelineId: 0, type: 'component' },
        { id: 5, track: 1, type: 'gutter' },
        { activityTableId: 0, componentName: 'ActivityTable', id: 6, type: 'component' },
      ],
      type: 'rows',
    },
    { id: 7, track: 3, type: 'gutter' },
    { componentName: 'ActivityForm', id: 8, type: 'component' },
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
export function updateGrid(grid: Grid, id: number, prop: string, value: any): Grid {
  if (grid.type === 'component' && grid.id === id) {
    return { ...grid, [prop]: value };
  }

  if (grid.type === 'columns') {
    if (id === grid.id) {
      return { ...grid, [prop]: value };
    }

    return {
      ...grid,
      columns: grid.columns.map(column => {
        if (column.type === 'columns' && id === column.id) {
          return { ...column, [prop]: value };
        } else {
          return updateGrid(column, id, prop, value);
        }
      }),
    };
  }

  if (grid.type === 'rows') {
    if (id === grid.id) {
      return { ...grid, [prop]: value };
    }

    return {
      ...grid,
      rows: grid.rows.map(row => {
        if (row.type === 'rows' && id === row.id) {
          return { ...row, [prop]: value };
        } else {
          return updateGrid(row, id, prop, value);
        }
      }),
    };
  }

  return grid;
}
