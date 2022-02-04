export type ColumnDef = {
  field: string;
  name: string;
  sortable?: boolean;
};

export type RowSelectionMode = 'multi' | 'none' | 'single';

export type RowSort = {
  direction: 'asc' | 'desc';
  field: string;
};
