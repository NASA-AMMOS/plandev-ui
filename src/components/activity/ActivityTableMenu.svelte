<svelte:options immutable={true} />

<script lang="ts">
  import { tooltip } from '../../utilities/tooltip';

  import { uniqueId } from 'lodash-es';

  import { Button, Select } from '@nasa-jpl/stellar-svelte';

  type T = $$Generic<TRowData>;

  import type { ColDef, ColumnState } from 'ag-grid-community';
  import { MoreHorizontal } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { TRowData } from '../../types/data-grid';

  export let columnDefs: ColDef[] | undefined = [];
  export let columnStates: ColumnState[] | undefined = [];

  type ColumnMenuItem = {
    field: keyof T;
    isHidden: boolean;
    name: string;
  };

  const dispatch = createEventDispatcher<{
    'columns-changed': { columns: ColumnMenuItem[] };
    'show-hide-all-columns': { hide: boolean };
  }>();

  let columnMenuItems: ColumnMenuItem[] = [];

  // Generate a unique ID for this component so we can work around inability to
  // get an element ref for a Button in this version of shadcn-svelte.
  let id = uniqueId();

  $: columnMenuItems = (columnDefs ?? []).map((derivedColumnDef: ColDef) => {
    const columnState = columnStates?.find((columnState: ColumnState) => columnState.colId === derivedColumnDef.field);

    if (columnState) {
      return {
        field: (derivedColumnDef.field as keyof T) ?? '',
        isHidden: columnState?.hide ?? derivedColumnDef.hide ?? false,
        name: derivedColumnDef.headerName ?? '',
      };
    }

    return {
      field: (derivedColumnDef.field as keyof T) ?? '',
      isHidden: true,
      name: derivedColumnDef.headerName ?? '',
    };
  });

  function onColumnsChanged(columns: { value: string | number | symbol }[]) {
    const newColumns = columnMenuItems.map(item => {
      return { ...item, isHidden: !columns.find(column => column.value === item.field) };
    });
    dispatch('columns-changed', { columns: newColumns });
  }

  function onHideAllColumns() {
    dispatch('show-hide-all-columns', { hide: true });
  }

  function onShowAllColumns() {
    dispatch('show-hide-all-columns', { hide: false });
  }
</script>

<div use:tooltip={{ content: 'Configure table columns' }}>
  <Select.Root
    multiple
    typeahead={false}
    selected={columnMenuItems.filter(i => !i.isHidden).map(i => ({ label: i.name, value: i.field }))}
    onSelectedChange={values => {
      if (values) {
        onColumnsChanged(values);
        document.getElementById(id)?.focus();
      }
    }}
  >
    <Select.Trigger asChild let:builder {id}>
      <Button
        builders={[builder]}
        aria-label="Configure table columns"
        size="icon"
        variant="outline"
        class="flex-shrink-0 [&+div]:hidden"
      >
        <MoreHorizontal size={16} />
      </Button>
    </Select.Trigger>
    <Select.Content
      class="flex flex-col overflow-hidden [&>div]:flex [&>div]:flex-col [&>div]:overflow-hidden"
      sameWidth={false}
      fitViewport
      sideOffset={4}
      side="top"
      align="end"
    >
      <Select.Label size="xs" class="pb-2">Columns</Select.Label>
      <div class="overflow-auto">
        {#each columnMenuItems as columnMenuItem (columnMenuItem)}
          <Select.Item value={columnMenuItem.field} label={columnMenuItem.name} size="xs">
            {columnMenuItem.name}</Select.Item
          >
        {/each}
      </div>
      <div class="mb-0.5 mt-2 flex gap-1">
        <Button class="flex-1" variant="outline" on:click={onShowAllColumns}>Show All</Button>
        <Button class="flex-1" variant="outline" on:click={onHideAllColumns}>Hide All</Button>
      </div>
    </Select.Content>
  </Select.Root>
</div>
