import type { ColDef } from 'ag-grid-community';

export type DataGridColumnDef<TRowData = any> = ColDef<TRowData>;

export interface DataGridRowSelection<TRowData> {
  data: TRowData;
  isSelected: boolean;
}

export type DataGridRowsSelection<TRowData> = TRowData[];

export type RowId = number | string;

export interface TRowData {
  id?: number;
  [key: string]: any;
}
