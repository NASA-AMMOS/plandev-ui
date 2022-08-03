<script lang="ts" context="module">
  import { goto, prefetch } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import type { Load } from '@sveltejs/kit';
  import { onMount } from 'svelte';
  import Nav from '../../components/app/Nav.svelte';
  import DatePickerField from '../../components/form/DatePickerField.svelte';
  import Field from '../../components/form/Field.svelte';
  import Input from '../../components/form/Input.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Chip from '../../components/ui/Chip.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import Table from '../../components/ui/Table.svelte';
  import { field } from '../../stores/form';
  import { createPlanError, creatingPlan } from '../../stores/plan';
  import { simulationTemplates } from '../../stores/simulation';
  import effects from '../../utilities/effects';
  import { compare, removeQueryParam } from '../../utilities/generic';
  import { convertUsToDurationString, getUnixEpochTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { min, required, timestamp } from '../../utilities/validators';

  export const load: Load = async ({ session }) => {
    if (!session.user) {
      return {
        redirect: `${base}/login`,
        status: 302,
      };
    }

    const { models = [], plans = [] } = await effects.getPlansAndModels();

    return {
      props: {
        models,
        plans,
      },
    };
  };
</script>

<script lang="ts">
  export let models: ModelList[] = [];
  export let plans: PlanList[] = [];

  let filterText: string = '';
  let nameInputField: HTMLInputElement;
  let durationString: string = 'None';

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
      plan.end_time.includes(filterTextLowerCase) ||
      `${plan.id}`.includes(filterTextLowerCase) ||
      `${plan.model_id}`.includes(filterTextLowerCase) ||
      plan.name.toLowerCase().includes(filterTextLowerCase) ||
      plan.start_time.includes(filterTextLowerCase)
    );
  });
  $: simulationTemplates.setVariables({ modelId: $modelIdField.value });
  $: sortedModels = models.sort((a, b) => compare(a.name, b.name));
  $: sortedPlans = filteredPlans.sort((a, b) => compare(a.name, b.name));

  onMount(() => {
    const queryModelId = $page.url.searchParams.get('modelId');
    if (queryModelId) {
      $modelIdField.value = parseFloat(queryModelId);
      modelIdField.validateAndSet();
      removeQueryParam('modelId');
      if (nameInputField) {
        nameInputField.focus();
      }
    }
  });

  async function createPlan() {
    const newPlan = await effects.createPlan(
      $endTimeField.value,
      $modelIdField.value,
      $nameField.value,
      $startTimeField.value,
      $simTemplateField.value,
    );

    if (newPlan) {
      plans = [...plans, newPlan];
    }
  }

  async function deletePlan(id: number): Promise<void> {
    const success = await effects.deletePlan(id);

    if (success) {
      plans = plans.filter(plan => plan.id !== id);
    }
  }

  function updateDurationString() {
    if ($startTimeField.valid && $endTimeField.valid) {
      durationString = convertUsToDurationString(
        (getUnixEpochTime($endTimeField.value) - getUnixEpochTime($startTimeField.value)) * 1000,
      );

      if (!durationString) {
        durationString = 'None';
      }
    } else {
      durationString = 'None';
    }
  }
</script>

<CssGrid rows="42px calc(100vh - 42px)">
  <Nav>
    <span slot="title">Plans</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <Chip>New Plan</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={createPlan}>
          <AlertError class="m-2" error={$createPlanError} />

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
            <input bind:this={nameInputField} autocomplete="off" class="st-input w-100" name="name" />
          </Field>

          <DatePickerField
            field={startTimeField}
            label="Start Time - YYYY-DDDThh:mm:ss"
            name="start-time"
            on:change={updateDurationString}
            on:keydown={updateDurationString}
          />

          <DatePickerField
            field={endTimeField}
            label="End Time - YYYY-DDDThh:mm:ss"
            name="end-time"
            on:change={updateDurationString}
            on:keydown={updateDurationString}
          />

          <fieldset>
            <label for="plan-duration">Plan Duration</label>
            <input class="st-input w-100" disabled id="plan-duration" name="duration" value={durationString} />
          </fieldset>

          <Field field={simTemplateField}>
            <label for="simulation-templates" slot="label"> Simulation Templates </label>
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
            <button class="st-button w-100" disabled={!createButtonEnabled} type="submit">
              {$creatingPlan ? 'Creating...' : 'Create'}
            </button>
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <Panel>
      <svelte:fragment slot="header">
        <Chip>
          <i class="bi bi-calendar-range" />
          Plans
        </Chip>
        <Input>
          <input bind:value={filterText} class="st-input" placeholder="Filter plans" style="width: 300px" />
        </Input>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if sortedPlans.length}
          <Table
            let:currentRow
            columnDefs={[
              { field: 'name', name: 'Name', sortable: true },
              { field: 'id', name: 'Plan ID', sortable: true },
              { field: 'model_id', name: 'Model ID', sortable: true },
              { field: 'start_time', name: 'Start Time', sortable: true },
              { field: 'end_time', name: 'End Time', sortable: true },
            ]}
            rowActions
            rowData={sortedPlans}
            on:rowClick={({ detail: plan }) => goto(`${base}/plans/${plan.id}`)}
            on:pointerEnter={({ detail: plan }) => prefetch(`${base}/plans/${plan.id}`)}
          >
            <button
              class="st-button icon"
              slot="actions-cell"
              on:click|stopPropagation={() => deletePlan(currentRow.id)}
              use:tooltip={{ content: 'Delete Plan', placement: 'bottom' }}
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
