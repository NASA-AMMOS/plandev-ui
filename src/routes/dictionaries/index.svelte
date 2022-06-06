<svelte:options immutable={true} />

<script lang="ts">
  import Nav from '../../components/app/Nav.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Chip from '../../components/ui/Chip.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import Table from '../../components/ui/Table.svelte';
  import { createDictionaryError, creatingDictionary, sortedDictionaries } from '../../stores/expansion';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';

  let createButtonDisabled: boolean = false;
  let files: FileList;

  $: createButtonDisabled = !files;
</script>

<CssGrid rows="42px calc(100vh - 42px)">
  <Nav>
    <span slot="title">Command Dictionaries</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <Chip>New Command Dictionary</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={() => effects.createCommandDictionary(files)}>
          <AlertError class="m-2" error={$createDictionaryError} />

          <fieldset>
            <label for="file">AMPCS Command Dictionary XML File</label>
            <input class="w-100" name="file" required type="file" bind:files />
          </fieldset>

          <fieldset>
            <button class="st-button w-100" disabled={createButtonDisabled} type="submit">
              {$creatingDictionary ? 'Creating...' : 'Create'}
            </button>
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <Panel>
      <svelte:fragment slot="header">
        <Chip>Command Dictionaries</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if $sortedDictionaries.length}
          <Table
            let:currentRow
            columnDefs={[
              { field: 'id', name: 'Dictionary ID', sortable: true },
              { field: 'mission', name: 'Mission', sortable: true },
              { field: 'version', name: 'Version', sortable: true },
              { field: 'command_types_typescript_path', name: 'Types Path', sortable: true },
              { field: 'created_at', name: 'Created At', sortable: true },
            ]}
            rowActions
            rowData={$sortedDictionaries}
          >
            <button
              class="st-button icon"
              slot="actions-cell"
              on:click|stopPropagation={() => effects.deleteCommandDictionary(currentRow.id)}
              use:tooltip={{ content: 'Delete Command Dictionary', placement: 'bottom' }}
            >
              <i class="bi bi-trash" />
            </button>
          </Table>
        {:else}
          No Command Dictionaries Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>
