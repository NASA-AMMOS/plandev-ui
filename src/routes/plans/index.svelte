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

    const { models = [], plans = [] } = await reqGetPlansAndModels(fetch);

    return {
      props: {
        models,
        plans,
      },
    };
  }
</script>

<script lang="ts">
  import { goto, prefetch } from '$app/navigation';
  import { page } from '$app/stores';
  import ConfirmModal from '../../components/modals/Confirm.svelte';
  import Field from '../../components/form/Field.svelte';
  import FieldInputText from '../../components/form/FieldInputText.svelte';
  import Label from '../../components/form/Label.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Card from '../../components/ui/Card.svelte';
  import Grid from '../../components/ui/Grid.svelte';
  import TopBar from '../../components/ui/TopBar.svelte';
  import { tooltip } from '../../utilities/tooltip';
  import { onMount } from 'svelte';
  import { compare, removeQueryParam } from '../../utilities/generic';
  import { required, timestamp } from '../../utilities/validators';
  import {
    CreatePlan,
    CreatePlanModel,
    reqCreatePlan,
    reqCreateSimulation,
    reqDeletePlanAndSimulations,
    reqGetPlansAndModels,
  } from '../../utilities/requests';
  import { simulationTemplates } from '../../stores/simulation';

  export let models: CreatePlanModel[] = [];
  export let plans: CreatePlan[] = [];

  let confirmDeletePlan: ConfirmModal | null = null;
  let createButtonText = 'Create';
  let endTime = '';
  let endTimeSubmittable = false;
  let error: string | null = null;
  let modelId: number = -1;
  let name = '';
  let nameSubmittable = false;
  let simulationTemplateId: number | null = null;
  let startTime = '';
  let startTimeSubmittable = false;

  $: createButtonDisabeld =
    !endTimeSubmittable ||
    modelId === -1 ||
    !nameSubmittable ||
    !startTimeSubmittable;
  $: simulationTemplates.setVariables({ modelId });
  $: sortedModels = models.sort((a, b) => compare(a.name, b.name));
  $: sortedPlans = plans.sort((a, b) => compare(a.name, b.name));

  onMount(() => {
    const queryModelId = $page.url.searchParams.get('modelId');
    if (queryModelId) {
      modelId = parseFloat(queryModelId);
      removeQueryParam('modelId');
    }
  });

  async function createPlan() {
    createButtonText = 'Creating...';
    error = null;

    const newPlan = await reqCreatePlan(endTime, modelId, name, startTime);
    await reqCreateSimulation(newPlan.id, simulationTemplateId);

    if (newPlan) {
      plans = [...plans, newPlan];
    } else {
      error = 'Create plan failed.';
    }

    createButtonText = 'Create';
  }

  async function deletePlan(event: CustomEvent<CreatePlan>) {
    const { detail: plan } = event;
    const { id } = plan;
    const success = await reqDeletePlanAndSimulations(id);

    if (success) {
      plans = plans.filter(plan => plan.id !== id);
    }
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
          <select
            class="st-select w-100"
            name="model"
            value={modelId}
            on:change={({ currentTarget }) => {
              const { value } = currentTarget;
              if (value !== '') {
                modelId = parseFloat(value);
              } else {
                modelId = -1;
              }
            }}
          >
            <option value="" />
            {#each sortedModels as model}
              <option value={model.id}>
                {model.name}
              </option>
            {/each}
          </select>
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
          bind:submittable={startTimeSubmittable}
          bind:value={startTime}
          name="start-time"
          placeholder="YYYY-DDDThh:mm:ss"
          required
          validators={[required, timestamp]}
        >
          Start Time
        </FieldInputText>

        <FieldInputText
          bind:submittable={endTimeSubmittable}
          bind:value={endTime}
          name="end-time"
          placeholder="YYYY-DDDThh:mm:ss"
          required
          validators={[required, timestamp]}
        >
          End Time
        </FieldInputText>

        <Field>
          <Label for="simulation-templates">Simulation Templates</Label>
          {#if $simulationTemplates.length}
            <select
              class="st-select w-100"
              name="simulation-templates"
              value={simulationTemplateId}
              on:change={({ currentTarget }) => {
                const { value } = currentTarget;
                if (value !== '') {
                  simulationTemplateId = parseFloat(value);
                } else {
                  simulationTemplateId = null;
                }
              }}
            >
              <option value="" />
              {#each $simulationTemplates as template}
                <option value={template.id}>
                  {template.description}
                </option>
              {/each}
            </select>
          {:else}
            <input class="st-input w-100" disabled value="Empty" />
          {/if}
        </Field>

        <Field>
          <button
            class="st-button create-button"
            disabled={createButtonDisabeld}
            type="submit"
          >
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
                      class="st-button icon fs-6"
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
                      class="st-button icon fs-6"
                      on:click|stopPropagation={() =>
                        confirmDeletePlan.modal.show(plan)}
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
                  <td>{plan.startTime}</td>
                  <td>{plan.endTime}</td>
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
    grid-template-columns: 16px 16px;
    justify-content: center;
  }

  .create-button {
    width: 100px;
  }
</style>
