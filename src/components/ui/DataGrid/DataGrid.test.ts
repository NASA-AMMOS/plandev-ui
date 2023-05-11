import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DataGrid from './DataGrid.svelte';

const numOfRows = 10;
const testRowData = [...new Array(numOfRows)].map((_, i) => ({ id: i, name: `test ${i}` }));

vi.stubGlobal(
  'ResizeObserver',
  vi.fn(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  })),
);

describe('DataGrid Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render all the rows', async () => {
    const { container } = render(DataGrid, {
      columnDefs: [
        {
          field: 'name',
          headerName: 'Name',
        },
      ],
      rowData: testRowData,
    });

    expect(container.querySelectorAll('.ag-center-cols-clipper .ag-row')).toHaveLength(numOfRows);
  });

  it('Should highlight the correctly selected rows on initialization', async () => {
    const { container } = render(DataGrid, {
      columnDefs: [
        {
          field: 'name',
          headerName: 'Name',
        },
      ],
      rowData: testRowData,
      rowSelection: 'multiple',
      selectedRowIds: [1, 2, 3],
    });

    expect(container.querySelectorAll('.ag-center-cols-clipper .ag-row.ag-row-selected')).toHaveLength(3);
  });

  it('Should highlight the correctly selected rows through user interaction', async () => {
    const { container } = render(DataGrid, {
      columnDefs: [
        {
          field: 'name',
          headerName: 'Name',
        },
      ],
      rowData: testRowData,
      rowSelection: 'multiple',
    });

    expect(container.querySelectorAll('.ag-center-cols-clipper .ag-row.ag-row-selected')).toHaveLength(0);

    await fireEvent.click(container.querySelectorAll('.ag-center-cols-clipper .ag-row')[0]);

    expect(container.querySelectorAll('.ag-center-cols-clipper .ag-row.ag-row-selected')).toHaveLength(1);

    await fireEvent.click(container.querySelectorAll('.ag-center-cols-clipper .ag-row')[2], { shiftKey: true });

    expect(container.querySelectorAll('.ag-center-cols-clipper .ag-row.ag-row-selected')).toHaveLength(3);
  });

  it('Should indicate that the row that was selected last is indicated as the current selected row', async () => {
    const { container } = render(DataGrid, {
      columnDefs: [
        {
          field: 'name',
          headerName: 'Name',
        },
      ],
      rowData: testRowData,
      rowSelection: 'multiple',
    });

    expect(container.querySelectorAll('.ag-center-cols-clipper .ag-row.ag-row-selected')).toHaveLength(0);

    await fireEvent.click(container.querySelectorAll('.ag-center-cols-clipper .ag-row')[2]);
    await fireEvent.click(container.querySelectorAll('.ag-center-cols-clipper .ag-row')[0], {
      bubbles: true,
      shiftKey: true,
    });

    expect(container.querySelectorAll('.ag-center-cols-clipper .ag-row.ag-row-selected')).toHaveLength(3);

    // need to wait for the component to fully update
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(
      container.querySelector('.ag-center-cols-clipper .ag-row.ag-row-selected.ag-current-row-selected'),
    ).not.toBeNull();
  });
});
