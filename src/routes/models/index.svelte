<script lang="ts" context="module">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { Load } from '@sveltejs/kit';
  import { onMount } from 'svelte';
  import Nav from '../../components/app/Nav.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Chip from '../../components/ui/Chip.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import Table from '../../components/ui/Table.svelte';
  import { createModelError, creatingModel, models, sortedModels } from '../../stores/plan';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';

  export const load: Load = async ({ session }) => {
    if (!session.user) {
      return {
        redirect: `${base}/login`,
        status: 302,
      };
    }

    const initialModels = await effects.getModels();

    return {
      props: {
        initialModels,
      },
    };
  };
</script>

<script lang="ts">
  export let initialModels: ModelList[] = [];

  let createButtonDisabled: boolean = false;
  let files: FileList;
  let name = '';
  let version = '';

  $: createButtonDisabled = !files || name === '' || version === '';

  onMount(() => {
    models.updateValue(() => initialModels);
  });
</script>

<CssGrid rows="42px calc(100vh - 42px)">
  <Nav>
    <span slot="title">Models</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <Chip>New Model</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={() => effects.createModel(name, version, files)}>
          <AlertError class="m-2" error={$createModelError} />

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
            <button class="st-button w-100" disabled={createButtonDisabled} type="submit">
              {$creatingModel ? 'Creating...' : 'Create'}
            </button>
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <Panel>
      <svelte:fragment slot="header">
        <Chip>
          <i class="bi bi-bar-chart" />
          Models
        </Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if $sortedModels.length}
          <Table
            let:currentRow
            columnDefs={[
              { field: 'name', name: 'Name', sortable: true },
              { field: 'id', name: 'Model ID', sortable: true },
              { field: 'version', name: 'Version', sortable: true },
            ]}
            rowActions
            rowData={$sortedModels}
            on:rowClick={({ detail: model }) => goto(`${base}/plans?modelId=${model.id}`)}
          >
            <button
              class="st-button icon"
              slot="actions-cell"
              on:click|stopPropagation={() => effects.deleteModel(currentRow)}
              use:tooltip={{ content: 'Delete Model', placement: 'bottom' }}
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
