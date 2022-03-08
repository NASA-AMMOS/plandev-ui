<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';

  export const load: Load = async ({ session }) => {
    if (!session.user) {
      return {
        redirect: '/login',
        status: 302,
      };
    }

    const { models = [], plans = [] } = await req.getPlansAndModels();

    return {
      props: {
        models,
        plans,
      },
    };
  };
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto, prefetch } from '$app/navigation';
  import { page } from '$app/stores';
  import Field from '../../components/form/Field.svelte';
  import Input from '../../components/form/Input.svelte';
  import ConfirmModal from '../../components/modals/Confirm.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Chip from '../../components/ui/Chip.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import Table from '../../components/ui/Table.svelte';
  import TopBar from '../../components/ui/TopBar.svelte';
  import { simulationTemplates } from '../../stores/simulation';
  import { field } from '../../stores/form';
  import { compare, removeQueryParam } from '../../utilities/generic';
  import req from '../../utilities/requests';
  import { tooltip } from '../../utilities/tooltip';
  import { min, required, timestamp } from '../../utilities/validators';

  export let models: CreatePlanModel[] = [];
  export let plans: CreatePlan[] = [];

  let confirmDeletePlan: ConfirmModal | null = null;
  let createButtonText = 'Create';
  let error: string | null = null;
  let filterText: string = '';
  let nameInputField: HTMLInputElement;

  let endTimeField = field<string>('', [required, timestamp]);
  let modelIdField = field<number>(-1, [min(1, 'Field is required')]);
  let nameField = field<string>('', [required]);
  let simTemplateField = field<number | null>(null);
  let startTimeField = field<string>('', [required, timestamp]);

  $: createButtonEnabled =
    $endTimeField.dirtyAndValid &&
    $modelIdField.dirtyAndValid &&
    $nameField.dirtyAndValid &&
    $startTimeField.dirtyAndValid;
  $: filteredPlans = plans.filter(plan => {
    const filterTextLowerCase = filterText.toLowerCase();
    return (
      plan.endTime.includes(filterTextLowerCase) ||
      `${plan.id}`.includes(filterTextLowerCase) ||
      `${plan.modelId}`.includes(filterTextLowerCase) ||
      plan.name.toLowerCase().includes(filterTextLowerCase) ||
      plan.startTime.includes(filterTextLowerCase)
    );
  });
  $: simulationTemplates.setVariables({ modelId: $modelIdField.value });
  $: sortedModels = models.sort((a, b) => compare(a.name, b.name));
  $: sortedPlans = filteredPlans.sort((a, b) => compare(a.name, b.name));

  onMount(() => {
    const queryModelId = $page.url.searchParams.get('modelId');
    if (queryModelId) {
      $modelIdField.value = parseFloat(queryModelId);
      modelIdField.validate();
      removeQueryParam('modelId');
      if (nameInputField) {
        nameInputField.focus();
      }
    }
  });

  async function createPlan() {
    createButtonText = 'Creating...';
    error = null;

    const newPlan = await req.createPlan(
      $endTimeField.value,
      $modelIdField.value,
      $nameField.value,
      $startTimeField.value,
    );
    await req.createSimulation(newPlan.id, $simTemplateField.value);
    await req.createSchedulingSpec({
      horizon_end: $endTimeField.value,
      horizon_start: $startTimeField.value,
      plan_id: newPlan.id,
      plan_revision: newPlan.revision,
      simulation_arguments: {},
    });

    if (newPlan) {
      plans = [...plans, newPlan];
    } else {
      error = 'Create plan failed.';
    }

    createButtonText = 'Create';
  }

  async function deletePlan(event: CustomEvent<CreatePlan>): Promise<void> {
    const { detail: plan } = event;
    const { id } = plan;
    const success = await req.deletePlan(id);

    if (success) {
      plans = plans.filter(plan => plan.id !== id);
    }
  }
</script>

<CssGrid rows="32px auto">
  <TopBar>Plans</TopBar>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <Chip>New Plan</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={createPlan}>
          <AlertError class="m-2" {error} />

          <Field field={modelIdField}>
            <label for="model" slot="label">Models</label>
            <select class="st-select w-100" data-type="number" name="model">
              <option value="-1" />
              {#each sortedModels as model}
                <option value={model.id}>
                  {model.name}
                </option>
              {/each}
            </select>
          </Field>

          <Field field={nameField}>
            <label for="name" slot="label">Name</label>
            <input
              bind:this={nameInputField}
              autocomplete="off"
              class="st-input w-100"
              name="name"
            />
          </Field>

          <Field field={startTimeField}>
            <label for="start-time" slot="label">Start Time</label>
            <input
              autocomplete="off"
              class="st-input w-100"
              name="start-time"
              placeholder="YYYY-DDDThh:mm:ss"
            />
          </Field>

          <Field field={endTimeField}>
            <label for="end-time" slot="label">End Time</label>
            <input
              autocomplete="off"
              class="st-input w-100"
              name="end-time"
              placeholder="YYYY-DDDThh:mm:ss"
            />
          </Field>

          <Field field={simTemplateField}>
            <label for="simulation-templates" slot="label">
              Simulation Templates
            </label>
            <select
              class="st-select w-100"
              data-type="number"
              disabled={!$simulationTemplates.length}
              name="simulation-templates"
            >
              {#if !$simulationTemplates.length}
                <option value="null">Empty</option>
              {:else}
                <option value="null" />
                {#each $simulationTemplates as template}
                  <option value={template.id}>
                    {template.description}
                  </option>
                {/each}
              {/if}
            </select>
          </Field>

          <fieldset>
            <button
              class="st-button w-100"
              disabled={!createButtonEnabled}
              type="submit"
            >
              {createButtonText}
            </button>
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <Panel>
      <svelte:fragment slot="header">
        <Chip>
          <i class="bi bi-calendar-range" />
          Existing Plans
        </Chip>
        <Input>
          <i class="bi bi-search" slot="left" />
          <input
            bind:value={filterText}
            class="st-input"
            placeholder="Filter plans"
            style="width: 300px"
          />
        </Input>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if sortedPlans.length}
          <Table
            let:currentRow
            columnDefs={[
              { field: 'name', name: 'Name', sortable: true },
              { field: 'id', name: 'Plan ID', sortable: true },
              { field: 'modelId', name: 'Model ID', sortable: true },
              { field: 'startTime', name: 'Start Time', sortable: true },
              { field: 'endTime', name: 'End Time', sortable: true },
            ]}
            rowActions
            rowData={sortedPlans}
            on:rowClick={({ detail: plan }) => goto(`plans/${plan.id}`)}
            on:pointerEnter={({ detail: plan }) => prefetch(`plans/${plan.id}`)}
          >
            <button
              class="st-button icon"
              slot="actions-cell"
              on:click|stopPropagation={() =>
                confirmDeletePlan.modal.show(currentRow)}
              use:tooltip={{
                content: 'Delete Plan',
                placement: 'bottom',
              }}
            >
              <i class="bi bi-trash" />
            </button>
          </Table>
        {:else}
          No Plans Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>

<ConfirmModal
  bind:this={confirmDeletePlan}
  confirmText="Delete"
  message="Are you sure you want to delete this plan?"
  title="Delete Plan"
  on:confirm={deletePlan}
/>
