<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';

  export const load: Load = async ({ session }) => {
    if (!session.user) {
      return {
        redirect: '/login',
        status: 302,
      };
    }

    const models = await req.getModels();

    return {
      props: {
        models,
      },
    };
  };
</script>

<script lang="ts">
  import { goto } from '$app/navigation';
  import ConfirmModal from '../../components/modals/ConfirmModal.svelte';
  import type Modal from '../../components/modals/Modal.svelte';
  import Chip from '../../components/ui/Chip.svelte';
  import Table from '../../components/ui/Table.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import Nav from '../../components/app/Nav.svelte';
  import { compare } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  import req from '../../utilities/requests';

  export let models: CreateModel[] = [];

  let confirmDeleteModelModal: Modal;
  let createButtonText = 'Create';
  let error: string | null = null;
  let files: FileList;
  let name = '';
  let version = '';

  $: sortedModels = models.sort((a, b) => compare(a.name, b.name));

  async function createModel() {
    createButtonText = 'Creating...';
    error = null;

    const file = files[0];
    const newModel = await req.createModel(name, version, file);

    if (newModel) {
      models = [...models, newModel];
    } else {
      error = 'Create model failed.';
    }

    createButtonText = 'Create';
  }

  async function deleteModel(event: CustomEvent<CreateModel>) {
    const { detail: model } = event;
    const { id, jarId } = model;
    const success = await req.deleteModel(id, jarId);

    if (success) {
      models = models.filter(model => model.id !== id);
    }
  }
</script>

<CssGrid class="h-100 w-100" rows="42px auto">
  <Nav>
    <span slot="title">Models</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <Chip>New Model</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={createModel}>
          <AlertError class="m-2" {error} />

          <fieldset>
            <label for="name">Name</label>
            <input bind:value={name} autocomplete="off" class="st-input w-100" name="name" required />
          </fieldset>

          <fieldset>
            <label for="version">Version</label>
            <input
              bind:value={version}
              autocomplete="off"
              class="st-input w-100"
              name="version"
              placeholder="0.0.0"
              required
            />
          </fieldset>

          <fieldset>
            <label for="file">Jar File</label>
            <input class="w-100" name="file" required type="file" bind:files />
          </fieldset>

          <fieldset>
            <button class="st-button w-100" disabled={!files || name === '' || version === ''} type="submit">
              {createButtonText}
            </button>
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <Panel>
      <svelte:fragment slot="header">
        <Chip>
          <i class="bi bi-bar-chart" />
          Existing Models
        </Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if models.length}
          <Table
            let:currentRow
            columnDefs={[
              { field: 'name', name: 'Name', sortable: true },
              { field: 'id', name: 'Model ID', sortable: true },
              { field: 'version', name: 'Version', sortable: true },
            ]}
            rowActions
            rowData={sortedModels}
            on:rowClick={({ detail: model }) => goto(`plans?modelId=${model.id}`)}
          >
            <button
              class="st-button icon"
              slot="actions-cell"
              on:click|stopPropagation={() => confirmDeleteModelModal.show(currentRow)}
              use:tooltip={{
                content: 'Delete Model',
                placement: 'bottom',
              }}
            >
              <i class="bi bi-trash" />
            </button>
          </Table>
        {:else}
          No Models Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>

<ConfirmModal
  bind:modal={confirmDeleteModelModal}
  confirmText="Delete"
  message="Are you sure you want to delete this model?"
  title="Delete Model"
  on:confirm={deleteModel}
/>
