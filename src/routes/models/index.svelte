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

    const { ssoToken: authorization } = session.user;
    const models = await reqGetModels(fetch, authorization);

    return {
      props: {
        models,
      },
    };
  }
</script>

<script lang="ts">
  import { session as appSession } from '$app/stores';
  import { goto } from '$app/navigation';
  import Field from '../../components/form/Field.svelte';
  import InputText from '../../components/form/InputText.svelte';
  import Label from '../../components/form/Label.svelte';
  import ConfirmModal from '../../components/modals/Confirm.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Card from '../../components/ui/Card.svelte';
  import Grid from '../../components/ui/Grid.svelte';
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

    const { ssoToken: authorization } = $appSession.user;
    const file = files[0];
    const newModel = await reqCreateModel(name, version, file, authorization);

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
    const { ssoToken: authorization } = $appSession.user;
    const success = await reqDeleteModel(id, jarId, authorization);

    if (success) {
      models = models.filter(model => model.id !== id);
    }
  }
</script>

<Grid rows="32px auto">
  <TopBar>Models</TopBar>
  <Grid gap="0.2rem" columns="20% auto" padding="0.2rem">
    <Card>
      <form on:submit|preventDefault={createModel}>
        <Field visible={error !== null}>
          <AlertError message={error} />
        </Field>

        <Field>
          <Label for="name">Name</Label>
          <InputText bind:value={name} name="name" required={true} />
        </Field>

        <Field>
          <Label for="version">Version</Label>
          <InputText
            bind:value={version}
            name="version"
            placeholder="0.0.0"
            required={true}
          />
        </Field>

        <Field>
          <Label for="file">Jar File</Label>
          <input class="w-100" name="file" required type="file" bind:files />
        </Field>

        <Field>
          <button
            class="st-button"
            disabled={!files || name === '' || version === ''}
            type="submit"
          >
            {createButtonText}
          </button>
        </Field>
      </form>
    </Card>
    <div>
      {#if models.length}
        <Card>
          <table class="table">
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
                  <td class="actions fs-6">
                    <button
                      class="st-button-icon"
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
                      class="st-button-icon"
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
        </Card>
      {:else}
        <Card class="p-1">No Models Found</Card>
      {/if}
    </div>
  </Grid>
</Grid>

<ConfirmModal
  bind:this={confirmDeleteModel}
  confirmText="Delete"
  message="Are you sure you want to delete this model?"
  title="Delete Model"
  on:confirm={deleteModel}
/>

<style>
  .actions {
    align-items: center;
    display: grid;
    gap: 12px;
    grid-template-columns: 12px 12px;
    justify-content: center;
  }
</style>
