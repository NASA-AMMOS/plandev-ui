<script lang="ts" context="module">
  import type { LoadInput, LoadOutput } from '@sveltejs/kit';
  import { GATEWAY_APOLLO_URL } from '../../env';
  import { CREATE_PLAN, DELETE_PLAN, GET_PLANS_AND_MODELS } from '../../gql';

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
        body: JSON.stringify({ query: GET_PLANS_AND_MODELS }),
        headers: { 'Content-Type': 'application/json', authorization },
        method: 'POST',
      };
      const response = await fetch(GATEWAY_APOLLO_URL, options);
      const { data } = await response.json();
      const { models = [], plans = [] } = data;

      return {
        props: {
          models,
          plans,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        props: {
          models: [],
          plans: [],
        },
      };
    }
  }
</script>

<script lang="ts">
  import { goto, prefetch } from '$app/navigation';
  import { page as appPage, session as appSession } from '$app/stores';
  import ConfirmModal from '../../components/modals/Confirm.svelte';
  import Field from '../../components/form/Field.svelte';
  import FieldInputText from '../../components/form/FieldInputText.svelte';
  import Label from '../../components/form/Label.svelte';
  import Select from '../../components/form/Select.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Card from '../../components/ui/Card.svelte';
  import Grid from '../../components/ui/Grid.svelte';
  import TopBar from '../../components/ui/TopBar.svelte';
  import { tooltip } from '../../utilities/tooltip';
  import { onMount } from 'svelte';
  import {
    compare,
    parseJsonFile,
    removeQueryParam,
  } from '../../utilities/generic';
  import { required, timestamp } from '../../utilities/validators';

  type Model = {
    id: string;
    name: string;
  };

  type Plan = {
    endTimestamp: string;
    id: string;
    modelId: string;
    name: string;
    startTimestamp: string;
  };

  export let models: Model[] = [];
  export let plans: Plan[] = [];

  let confirmDeletePlan: ConfirmModal | null = null;
  let createButtonText = 'Create';
  let endTimestamp = '';
  let endTimestampSubmittable = false;
  let error: string | null = null;
  let files: FileList;
  let modelId: string = '';
  let name = '';
  let nameSubmittable = false;
  let startTimestamp = '';
  let startTimestampSubmittable = false;

  $: createButtonDisabeld =
    !endTimestampSubmittable ||
    modelId === '' ||
    !nameSubmittable ||
    !startTimestampSubmittable;
  $: selectedModelName = models.find(model => model.id === modelId)?.name || '';
  $: sortedModels = models.sort((a, b) => compare(a.name, b.name));
  $: sortedPlans = plans.sort((a, b) => compare(a.name, b.name));

  onMount(() => {
    const queryModelId = $appPage.query.get('modelId');
    if (queryModelId) {
      modelId = queryModelId;
      removeQueryParam('modelId');
    }
  });

  async function createPlan() {
    createButtonText = 'Creating...';
    error = null;

    const { ssoToken: authorization } = $appSession.user;
    const modelArguments = await getModelArguments();
    const body = {
      query: CREATE_PLAN,
      variables: {
        endTimestamp,
        modelArguments,
        modelId,
        name,
        startTimestamp,
      },
    };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };

    try {
      const response = await fetch(GATEWAY_APOLLO_URL, options);
      const { data } = await response.json();
      const { createPlan } = data;
      const { id, message, success } = createPlan;

      if (success) {
        const newPlan = {
          endTimestamp,
          id,
          modelId,
          name,
          startTimestamp,
        };
        plans = [...plans, newPlan];
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

  async function deletePlan() {
    const { plan } = confirmDeletePlan.modal.context;
    const { id } = plan;
    const { ssoToken: authorization } = $appSession.user;
    const body = { query: DELETE_PLAN, variables: { id } };
    const options = {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', authorization },
      method: 'POST',
    };

    confirmDeletePlan.modal.hide();

    try {
      const response = await fetch(GATEWAY_APOLLO_URL, options);
      const { data } = await response.json();
      const { deletePlan } = data;
      const { message, success } = deletePlan;

      if (success) {
        plans = plans.filter(plan => plan.id !== id);
      } else {
        console.log(message);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function getModelArguments() {
    if (files && files.length) {
      try {
        const file = files.item(0);
        const modelArguments = await parseJsonFile(file);
        return modelArguments;
      } catch (e) {
        console.log(e);
        return {};
      }
    }
    return {};
  }
</script>

<Grid rows="32px auto">
  <TopBar>Plans</TopBar>
  <Grid gap="0.2rem" columns="20% auto" padding="0.2rem">
    <Card>
      <form on:submit|preventDefault={createPlan}>
        <Field visible={error !== null}>
          <AlertError message={error} />
        </Field>

        <Field>
          <Label for="model">Models</Label>
          <Select
            bind:value={modelId}
            name="model"
            required
            selected={selectedModelName}
          >
            <option value="" />
            {#each sortedModels as model}
              <option value={model.id}>
                {model.name}
              </option>
            {/each}
          </Select>
        </Field>

        <FieldInputText
          bind:submittable={nameSubmittable}
          bind:value={name}
          name="name"
          required
          validators={[required]}
        >
          Name
        </FieldInputText>

        <FieldInputText
          bind:submittable={startTimestampSubmittable}
          bind:value={startTimestamp}
          name="startTimestamp"
          placeholder="YYYY-DDDThh:mm:ss"
          required
          validators={[required, timestamp]}
        >
          Start Timestamp
        </FieldInputText>

        <FieldInputText
          bind:submittable={endTimestampSubmittable}
          bind:value={endTimestamp}
          name="endTimestamp"
          placeholder="YYYY-DDDThh:mm:ss"
          required
          validators={[required, timestamp]}
        >
          End Timestamp
        </FieldInputText>

        <Field>
          <Label for="file">Simulation Configuration</Label>
          <input class="w-100" name="file" type="file" bind:files />
        </Field>

        <Field>
          <button class="button" disabled={createButtonDisabeld} type="submit">
            {createButtonText}
          </button>
        </Field>
      </form>
    </Card>
    <div>
      {#if plans.length}
        <Card>
          <table class="table">
            <thead>
              <tr>
                <th>Actions</th>
                <th>Name</th>
                <th>Plan ID</th>
                <th>Model ID</th>
                <th>Start Time</th>
                <th>End Time</th>
              </tr>
            </thead>
            <tbody>
              {#each sortedPlans as plan}
                <tr>
                  <td class="actions">
                    <button
                      class="button-icon"
                      on:click={() => goto(`plans/${plan.id}`)}
                      on:pointerenter={() => prefetch(`plans/${plan.id}`)}
                      use:tooltip={{
                        content: 'Open Plan',
                        placement: 'bottom',
                      }}
                    >
                      <i class="bi bi-box-arrow-in-up-right" />
                    </button>
                    <button
                      class="button-icon"
                      on:click|stopPropagation={() =>
                        confirmDeletePlan.modal.show({ plan })}
                      use:tooltip={{
                        content: 'Delete Plan',
                        placement: 'bottom',
                      }}
                    >
                      <i class="bi bi-trash" />
                    </button>
                  </td>
                  <td>{plan.name}</td>
                  <td>{plan.id}</td>
                  <td>{plan.modelId}</td>
                  <td>{plan.startTimestamp}</td>
                  <td>{plan.endTimestamp}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </Card>
      {:else}
        <Card class="p-1">No Plans Found</Card>
      {/if}
    </div>
  </Grid>
</Grid>

<ConfirmModal
  bind:this={confirmDeletePlan}
  confirmText="Delete"
  message="Are you sure you want to delete this plan?"
  title="Delete Plan"
  on:confirm={deletePlan}
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
