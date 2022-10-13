<svelte:options immutable={true} />

<script lang="ts">
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import type { ColDef, ColumnState } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import Input from '../form/Input.svelte';
  import Menu from '../menus/Menu.svelte';
  import MenuItem from '../menus/MenuItem.svelte';

  export let columnDefs: ColDef[] = [];
  export let columnStates: ColumnState[] = [];

  type ColumnMenuItem = {
    field: keyof Activity;
    isHidden: boolean;
    name: string;
  };

  const dispatch = createEventDispatcher();

  let columnMenuItems: ColumnMenuItem[] = [];
  let displayedColumnMenuItems: ColumnMenuItem[] = [];
  let searchFilter: string = '';
  let tableMenu: Menu;

  $: columnMenuItems = columnDefs.map((derivedColumnDef: ColDef) => {
    const columnState = columnStates.find((columnState: ColumnState) => columnState.colId === derivedColumnDef.field);

    if (columnState) {
      return {
        field: derivedColumnDef.field as keyof Activity,
        isHidden: columnState?.hide ?? derivedColumnDef.hide ?? false,
        name: derivedColumnDef.headerName,
      };
    }

    return {
      field: derivedColumnDef.field as keyof Activity,
      isHidden: true,
      name: derivedColumnDef.headerName,
    };
  });

  $: displayedColumnMenuItems = columnMenuItems.filter((columnMenuItem: ColumnMenuItem) => {
    return new RegExp(searchFilter, 'i').test(columnMenuItem.field);
  });

  function onColumnToggleChange(column: ColumnMenuItem) {
    dispatch('toggle-column', {
      field: column.field,
      isHidden: !column.isHidden,
    });
  }

  function onHideAllColumns() {
    dispatch('show-hide-all-columns', { hide: true });
  }

  function onShowAllColumns() {
    dispatch('show-hide-all-columns', { hide: false });
  }

  function onSearchFilterChange(event: Event) {
    const input = event.target as HTMLInputElement;
    searchFilter = input.value;
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="grid-menu st-typography-medium" on:click|stopPropagation={() => tableMenu.toggle()}>
  <div class="button"><div class="button-title">...</div></div>
  <Menu bind:this={tableMenu} hideAfterClick={false}>
    <div class="title">COLUMNS</div>
    <div class="search-field">
      <Input>
        <input class="st-input w-100" value={searchFilter} on:input={onSearchFilterChange} />
        <div class="search-icon" slot="left"><SearchIcon /></div>
      </Input>
    </div>
    {#each displayedColumnMenuItems as columnMenuItem (columnMenuItem)}
      <MenuItem on:click={() => onColumnToggleChange(columnMenuItem)}>
        <input type="checkbox" checked={!columnMenuItem.isHidden} />
        <div class="column-name">{columnMenuItem.name}</div>
      </MenuItem>
    {/each}
    <div class="bulk-actions">
      <button class="st-button secondary" on:click={onShowAllColumns}>Show All</button>
      <button class="st-button secondary" on:click={onHideAllColumns}>Hide All</button>
    </div>
  </Menu>
</div>

<style>
  .grid-menu {
    --aerie-menu-item-template-columns: min-content auto;
    --aerie-menu-item-line-height: 1rem;
    --aerie-menu-item-font-size: 12px;
    --aerie-menu-item-padding: 4px;
    align-items: center;
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    font-size: 13px;
    gap: 5px;
    height: 24px;
    justify-content: center;
    padding: 4px 8px;
    position: relative;
    user-select: none;
  }

  .grid-menu:hover {
    background-color: var(--st-button-secondary-hover-background-color);
  }

  .button {
    position: relative;
    z-index: 1;
  }

  .button-title {
    align-items: baseline;
    display: flex;
    font-size: 1.5rem;
    font-weight: bold;
    letter-spacing: -1px;
    line-height: 0px;
    margin-top: -4px;
  }

  .title {
    color: var(--st-gray-40);
    cursor: auto;
    font-size: 11px;
    font-weight: 700;
    padding: 8px;
  }

  .search-field {
    display: flex;
    margin: 0 4px;
    position: relative;
  }

  .search-icon {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
  }

  .column-name {
    color: var(--st-gray-60);
    letter-spacing: 0.04em;
  }

  .bulk-actions {
    column-gap: 0.5rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin: 0.5rem;
  }
</style>
