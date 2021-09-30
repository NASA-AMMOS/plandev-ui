<script lang="ts" context="module">
  import type { LoadInput, LoadOutput } from '@sveltejs/kit';
  import { GATEWAY_APOLLO_URL } from '../../env';
  import { CREATE_MODEL, DELETE_MODEL, GET_MODELS } from '../../gql';

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

    try {
      const { ssoToken: authorization } = session.user;
      const options = {
        body: JSON.stringify({ query: GET_MODELS }),
        headers: { 'Content-Type': 'application/json', authorization },
        method: 'POST',
      };
      const response = await fetch(GATEWAY_APOLLO_URL, options);
      const { data } = await response.json();
      const { models = [] } = data;

      return {
        props: {
          models,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        props: {
          models: [],
        },
      };
    }
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

  type Model = {
    id: string;
    name: string;
    version: string;
  };

  export let models: Model[] = [];

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
    const fileMap = {
      file: ['variables.file'],
    };
    const operations = {
      query: CREATE_MODEL,
      variables: {
        file: null,
        mission: '',
        name,
        owner: '',
        version,
      },
    };

    // Form append order matters here!
    const body = new FormData();
    const file = files[0];
    body.append('operations', JSON.stringify(operations));
    body.append('map', JSON.stringify(fileMap));
    body.append('file', file, file.name);

    const options = {
      body,
      headers: { authorization },
      method: 'POST',
    };

    try {
      const response = await fetch(GATEWAY_APOLLO_URL, options);
      const { data } = await response.json();
      const { createModel } = data;
      const { id, message, success } = createModel;

      if (success) {
        models = [...models, { id, name, version }];
      } else {
        console.log(message);
        error = message;
      }
    } catch (e) {
      console.log(e);
      error = e.message;
    }

    createButtonText = 'Create';
  }

  async function deleteModel() {
    const { model } = confirmDeleteModel.modal.context;
    const { id } = model;
    const { ssoToken: authorization } = $appSession.user;
    const body = { query: DELETE_MODEL, variables: { id } };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };

    confirmDeleteModel.modal.hide();

    try {
      const response = await fetch(GATEWAY_APOLLO_URL, options);
      const { data } = await response.json();
      const { deleteModel } = data;
      const { message, success } = deleteModel;

      if (success) {
        models = models.filter(model => model.id !== id);
      } else {
        console.log(message);
      }
    } catch (e) {
      console.log(e);
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
            class="button"
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
                  <td class="actions">
                    <button
                      class="button-icon"
                      on:click={() => goto(`plans?modelId=${model.id}`)}
                      use:tooltip={{
                        content: 'Create Plan',
                        placement: 'bottom',
                      }}
                    >
                      <i class="bi bi-calendar-plus" />
                    </button>
                    <button
                      class="button-icon"
                      on:click|stopPropagation={() =>
                        confirmDeleteModel.modal.show({ model })}
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
