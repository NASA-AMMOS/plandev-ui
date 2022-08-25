<svelte:options immutable={true} />

<script lang="ts">
  import { goto, prefetch } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import Nav from '../../components/app/Nav.svelte';
  import DatePickerField from '../../components/form/DatePickerField.svelte';
  import Field from '../../components/form/Field.svelte';
  import Input from '../../components/form/Input.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Chip from '../../components/ui/Chip.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import DataGrid from '../../components/ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../../components/ui/DataGrid/DataGridActions.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import { field } from '../../stores/form';
  import { createPlanError, creatingPlan } from '../../stores/plan';
  import { simulationTemplates } from '../../stores/simulation';
  import effects from '../../utilities/effects';
  import { compare, removeQueryParam } from '../../utilities/generic';
  import { convertUsToDurationString, getUnixEpochTime } from '../../utilities/time';
  import { min, required, timestamp } from '../../utilities/validators';
  import type { PageData } from './$types';

  export let data: PageData;

  type CellRendererParams = {
    deletePlan: (plan: Plan) => void;
  };
  type PlanCellRendererParams = ICellRendererParams<Plan> & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    { field: 'name', headerName: 'Name', resizable: true, sortable: true },
    {
      field: 'id',
      headerName: 'Plan ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 100,
    },
    { field: 'model_id', headerName: 'Model ID', sortable: true, suppressAutoSize: true, width: 120 },
    { field: 'start_time', headerName: 'Start Time', resizable: true, sortable: true },
    { field: 'end_time', headerName: 'End Time', resizable: true, sortable: true },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: PlanCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deletePlan,
            deleteTooltip: {
              content: 'Delete Plan',
              placement: 'bottom',
            },
            rowData: params.data,
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deletePlan,
      } as CellRendererParams,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 25,
    },
  ];

  let durationString: string = 'None';
  let filterText: string = '';
  let models: ModelList[];
  let nameInputField: HTMLInputElement;
  let plans: PlanList[];

  let endTimeField = field<string>('', [required, timestamp]);
  let modelIdField = field<number>(-1, [min(1, 'Field is required')]);
  let nameField = field<string>('', [required]);
  let simTemplateField = field<number | null>(null);
  let startTimeField = field<string>('', [required, timestamp]);

  $: plans = data.plans;
  $: models = data.models;
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

  async function deletePlan({ id }: Plan): Promise<void> {
    const success = await effects.deletePlan(id);

    if (success) {
      plans = plans.filter(plan => plan.id !== id);
    }
  }

  function prefetchPlan(plan: Plan) {
    prefetch(`${base}/plans/${plan.id}`);
  }

  function showPlan(plan: Plan) {
    goto(`${base}/plans/${plan.id}`);
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
          <DataGrid
            {columnDefs}
            highlightOnSelection={false}
            rowData={sortedPlans}
            rowSelection="single"
            on:rowSelected={({ detail }) => showPlan(detail.data)}
            on:cellMouseOver={({ detail }) => prefetchPlan(detail.data)}
          />
        {:else}
          No Plans Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>
