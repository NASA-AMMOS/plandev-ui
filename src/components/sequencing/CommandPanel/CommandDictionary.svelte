<svelte:options immutable={true} />

<script lang="ts">
  import type { CommandDictionary, FswCommand, HwCommand } from '@nasa-jpl/aerie-ampcs';
  import ChevronRightIcon from '@nasa-jpl/stellar/icons/chevron_right.svg?component';
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { isFswCommand, isFswCommandArgumentEnum } from '../../../utilities/codemirror/codemirror-utils';
  import { getTarget } from '../../../utilities/generic';
  import Input from '../../form/Input.svelte';

  export let commandDictionary: CommandDictionary;
  export let selectedCommandDefinition: (FswCommand | HwCommand) | null = null;

  type SearchField = 'command_name' | 'enum' | 'argument_name';

  const dispatch = createEventDispatcher<{
    selectCommandDefinition: (FswCommand | HwCommand) | null;
  }>();

  const searchFieldMap: Record<SearchField, string> = {
    argument_name: 'argument names',
    command_name: 'command names',
    enum: 'enums',
  };

  let commandList: (FswCommand | HwCommand)[] = [];
  let commandResults: (FswCommand | HwCommand)[] = [];
  let searchField: SearchField = 'command_name';
  let searchValue: string = '';

  $: commandList = [...commandDictionary.fswCommands, ...commandDictionary.hwCommands];
  $: commandResults = commandList;
  $: {
    switch (searchField) {
      case 'enum': {
        commandResults = commandList.filter(command => {
          return (
            isFswCommand(command) &&
            command.arguments.find(argument => {
              return isFswCommandArgumentEnum(argument) && argument.enum_name.toLowerCase().includes(searchValue);
            }) !== undefined
          );
        });
        break;
      }
      case 'argument_name': {
        commandResults = commandList.filter(command => {
          return (
            (command as FswCommand).arguments.find(argument => {
              return argument.name.toLowerCase().includes(searchValue);
            }) !== undefined
          );
        });
        break;
      }
      case 'command_name':
      default: {
        commandResults = commandList.filter(command => {
          return command.stem.toLowerCase().includes(searchValue);
        });
        break;
      }
    }
  }

  function onSearch(event: Event) {
    const { value } = getTarget(event);
    searchValue = `${value}`.toLowerCase();
  }

  function onSelectCommandDefinition(commandDefinition: FswCommand | HwCommand) {
    dispatch('selectCommandDefinition', commandDefinition);
  }

  function onClear() {
    dispatch('selectCommandDefinition', null);
  }
</script>

<div class="command-dictionary-container">
  <div class="dictionary-name">
    <div class="breadcrumbs-container">
      {#if selectedCommandDefinition !== null}
        <button class="st-button-link breadcrumb" on:click={onClear}>{commandDictionary.id}</button>
        <ChevronRightIcon />
        <div class="breadcrumb">{selectedCommandDefinition.stem}</div>
      {:else}
        {commandDictionary.id}
      {/if}
    </div>
  </div>
  <div class="dictionary-search" class:hidden={selectedCommandDefinition !== null}>
    <label for="dictionary-search">Command Dictionary</label>
    <div class="search-input">
      <Input>
        <div class="search-icon" slot="left"><SearchIcon /></div>
        <input
          class="st-input w-100"
          name="dictionary-search"
          placeholder={`Search ${searchFieldMap[searchField]}`}
          on:input={onSearch}
        />
      </Input>
      <select bind:value={searchField} class="st-select w-100">
        <option value={'command_name'}>Command name</option>
        <option value={'enum'}>Enum</option>
        <option value={'argument_name'}>Argument name</option>
      </select>
    </div>
    <div class="dictionary-results">
      {#each commandResults as commandResult}
        <div class="dictionary-result">
          <button class="st-button-link" on:click={() => onSelectCommandDefinition(commandResult)}>
            {commandResult.stem}
          </button>
        </div>
      {/each}
    </div>
  </div>
  <div class="command-metadata-container" class:hidden={selectedCommandDefinition === null}>
    <div class="command-description">
      {selectedCommandDefinition?.description}
    </div>
    {#if selectedCommandDefinition && isFswCommand(selectedCommandDefinition)}
      <div class="command-arguments">
        {#each selectedCommandDefinition.arguments as argument}
          {argument.name}
        {/each}
      </div>
    {:else}
      <div></div>
    {/if}
  </div>
</div>

<style>
  .command-dictionary-container {
    display: grid;
    grid-template-rows: min-content auto;
    height: 100%;
    overflow: hidden;
  }

  .dictionary-name {
    background: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-20);
    display: grid;
    font-weight: 500;
    grid-template-columns: auto min-content;
    padding: 8px 16px;
  }

  .breadcrumbs-container {
    column-gap: 4px;
    display: flex;
  }

  .breadcrumbs-container :global(svg) {
    color: var(--st-gray-40);
  }

  .breadcrumb {
    max-width: 40%;
    overflow-x: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dictionary-search {
    display: flex;
    flex-flow: column;
    overflow: hidden;
    padding: 8px 0;
    row-gap: 8px;
  }

  .dictionary-search label {
    font-weight: 500;
    padding: 0 16px;
  }

  .dictionary-search .search-input {
    column-gap: 8px;
    display: grid;
    grid-template-columns: auto max-content;
    padding: 0 16px;
  }

  .dictionary-search .search-icon {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
  }

  .dictionary-results {
    display: flex;
    flex-flow: column;
    height: 100%;
    overflow: auto;
    padding: 8px 16px;
    row-gap: 8px;
  }

  .hidden {
    display: none;
  }

  .command-metadata-container {
    overflow: hidden;
    padding: 8px 16px;
  }
</style>
