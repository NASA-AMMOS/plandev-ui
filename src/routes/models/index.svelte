<script lang="ts" context="module">
  import type { LoadInput, LoadOutput } from '@sveltejs/kit';

  export async function load({
    fetch,
    session,
  }: LoadInput): Promise<LoadOutput> {
    if (!session.user) {
      return {
        redirect: '/login',
        status: 302,
      };
    }

    const models = await reqGetModels(fetch);

    return {
      props: {
        models,
      },
    };
  }
</script>

<script lang="ts">
  import { goto } from '$app/navigation';
  import ConfirmModal from '../../components/modals/Confirm.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Card from '../../components/ui/Card.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import TopBar from '../../components/ui/TopBar.svelte';
  import { compare } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  import {
    CreateModel,
    reqCreateModel,
    reqDeleteModel,
    reqGetModels,
  } from '../../utilities/requests';

  export let models: CreateModel[] = [];

  let confirmDeleteModel: ConfirmModal | null = null;
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
    const newModel = await reqCreateModel(name, version, file);

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
    const success = await reqDeleteModel(id, jarId);

    if (success) {
      models = models.filter(model => model.id !== id);
    }
  }
</script>

<CssGrid rows="32px auto">
  <TopBar>Models</TopBar>
  <CssGrid gap="0.2rem" columns="20% auto" padding="0.2rem">
    <Card>
      <form on:submit|preventDefault={createModel}>
        {#if error !== null}
          <fieldset>
            <AlertError message={error} />
          </fieldset>
        {/if}

        <fieldset>
          <label for="name">Name</label>
          <input
            bind:value={name}
            autocomplete="off"
            class="st-input w-100"
            name="name"
            required
          />
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
          <button
            class="st-button"
            disabled={!files || name === '' || version === ''}
            style="width: 100px"
            type="submit"
          >
            {createButtonText}
          </button>
        </fieldset>
      </form>
    </Card>
    <div>
      {#if models.length}
        <table class="st-table">
          <thead>
            <tr>
              <th>Actions</th>
              <th>Name</th>
              <th>Model ID</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody>
            {#each sortedModels as model}
              <tr>
                <td class="actions">
                  <button
                    class="st-button icon"
                    data-cy="create-plan-{model.name}"
                    on:click={() => goto(`plans?modelId=${model.id}`)}
                    use:tooltip={{
                      content: 'Create Plan',
                      placement: 'bottom',
                    }}
                  >
                    <i class="bi bi-calendar-plus" />
                  </button>
                  <button
                    class="st-button icon"
                    data-cy="delete-model-{model.name}"
                    on:click|stopPropagation={() =>
                      confirmDeleteModel.modal.show(model)}
                    use:tooltip={{
                      content: 'Delete Model',
                      placement: 'bottom',
                    }}
                  >
                    <i class="bi bi-trash" />
                  </button>
                </td>
                <td>{model.name}</td>
                <td>{model.id}</td>
                <td>{model.version}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <Card class="p-1">No Models Found</Card>
      {/if}
    </div>
  </CssGrid>
</CssGrid>

<ConfirmModal
  bind:this={confirmDeleteModel}
  confirmText="Delete"
  message="Are you sure you want to delete this model?"
  title="Delete Model"
  on:confirm={deleteModel}
/>
