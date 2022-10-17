type DataGridColumnDef = import('ag-grid-community').ColDef;

interface DataGridRowSelection<TRowData> {
  data: TRowData;
  isSelected: boolean;
}

type DataGridRowsSelection<TRowData> = TRowData[];

interface ICellRendererParams<T> {
  data: T;
}

type RowId = number | string;

interface TRowData {
  id?: number;
  [key: string]: any;
}
