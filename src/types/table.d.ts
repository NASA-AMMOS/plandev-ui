type ColumnDef = {
  field: string;
  name: string;
  sortable?: boolean;
};

type RowSelectionMode = 'multi' | 'none' | 'single';

type RowSort = {
  direction: 'asc' | 'desc';
  field: string;
};
