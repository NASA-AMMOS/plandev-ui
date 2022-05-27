<svelte:options immutable={true} />

<script lang="ts">
  import ConfirmModal from '../../components/modals/ConfirmModal.svelte';
  import type Modal from '../../components/modals/Modal.svelte';
  import Chip from '../../components/ui/Chip.svelte';
  import Table from '../../components/ui/Table.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import Nav from '../../components/app/Nav.svelte';
  import { dictionaries } from '../../stores/expansion';
  import { compare } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  import req from '../../utilities/requests';

  let confirmDeleteDictionaryModal: Modal;
  let createButtonText = 'Create';
  let error: string | null = null;
  let files: FileList;

  $: sortedDictionaries = $dictionaries.sort((a, b) => compare(a.version, b.version));

  async function createDictionary() {
    createButtonText = 'Creating...';
    error = null;

    const file = files[0];
    const newDictionaryId = await req.createCommandDictionary(file);

    if (newDictionaryId === null) {
      error = 'Create dictionary failed.';
    }

    createButtonText = 'Create';
  }

  async function deleteDictionary(event: CustomEvent<CommandDictionary>) {
    const { detail: dictionary } = event;
    const { id } = dictionary;
    const success = await req.deleteCommandDictionary(id);

    if (success) {
      sortedDictionaries = sortedDictionaries.filter(dictionary => dictionary.id !== id);
    }
  }
</script>

<CssGrid rows="42px calc(100vh - 42px)">
  <Nav>
    <span slot="title">Dictionaries</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <Chip>New Dictionary</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={createDictionary}>
          <AlertError class="m-2" {error} />

          <fieldset>
            <label for="file">AMPCS Command Dictionary XML File</label>
            <input class="w-100" name="file" required type="file" bind:files />
          </fieldset>

          <fieldset>
            <button class="st-button w-100" disabled={!files} type="submit">
              {createButtonText}
            </button>
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <Panel>
      <svelte:fragment slot="header">
        <Chip>Dictionaries</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if sortedDictionaries.length}
          <Table
            let:currentRow
            columnDefs={[
              { field: 'id', name: 'Dictionary ID', sortable: true },
              { field: 'mission', name: 'Mission', sortable: true },
              { field: 'version', name: 'Version', sortable: true },
              { field: 'command_types_typescript_path', name: 'Types Path', sortable: true },
            ]}
            rowActions
            rowData={sortedDictionaries}
          >
            <button
              class="st-button icon"
              slot="actions-cell"
              on:click|stopPropagation={() => confirmDeleteDictionaryModal.show(currentRow)}
              use:tooltip={{ content: 'Delete Dictionary', placement: 'bottom' }}
            >
              <i class="bi bi-trash" />
            </button>
          </Table>
        {:else}
          No Dictionaries Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>

<ConfirmModal
  bind:modal={confirmDeleteDictionaryModal}
  confirmText="Delete"
  message="Are you sure you want to delete this dictionary?"
  title="Delete Dictionary"
  on:confirm={deleteDictionary}
/>
