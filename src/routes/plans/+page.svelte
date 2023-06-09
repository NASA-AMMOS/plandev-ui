<svelte:options immutable={true} />

<script lang="ts">
  import { goto, preloadData } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import PlanIcon from '@nasa-jpl/stellar/icons/plan.svg?component';
  import type { ICellRendererParams } from 'ag-grid-community';
  import { onMount } from 'svelte';
  import Nav from '../../components/app/Nav.svelte';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import DatePickerField from '../../components/form/DatePickerField.svelte';
  import Field from '../../components/form/Field.svelte';
  import Input from '../../components/form/Input.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import DataGridActions from '../../components/ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../../components/ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import SectionTitle from '../../components/ui/SectionTitle.svelte';
  import { field } from '../../stores/form';
  import { createPlanError, creatingPlan } from '../../stores/plan';
  import { simulationTemplates } from '../../stores/simulation';
  import type { DataGridColumnDef, RowId } from '../../types/data-grid';
  import type { ModelSlim } from '../../types/model';
  import type { Plan, PlanSlim } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { removeQueryParam } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { convertUsToDurationString, getUnixEpochTime } from '../../utilities/time';
  import { min, required, timestamp } from '../../utilities/validators';
  import type { PageData } from './$types';

  export let data: PageData;

  type CellRendererParams = {
    deletePlan: (plan: Plan) => void;
  };
  type PlanCellRendererParams = ICellRendererParams<Plan> & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 60,
    },
    { field: 'name', filter: 'text', headerName: 'Name', resizable: true, sortable: true },
    { field: 'model_id', filter: 'number', headerName: 'Model ID', sortable: true, suppressAutoSize: true, width: 120 },
    { field: 'start_time_doy', filter: 'text', headerName: 'Start Time', resizable: true, sortable: true },
    { field: 'end_time_doy', filter: 'text', headerName: 'End Time', resizable: true, sortable: true },
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
            hasDeletePermission: params.data ? featurePermissions.plan.canDelete(data.user, params.data) : false,
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
  const canCreate: boolean = featurePermissions.plan.canCreate(data.user);
  const permissionError: string = 'You do not have permission to create a plan';

  let durationString: string = 'None';
  let filterText: string = '';
  let models: ModelSlim[];
  let nameInputField: HTMLInputElement;
  let plans: PlanSlim[];

  let endTimeDoyField = field<string>('', [required, timestamp]);
  let modelIdField = field<number>(-1, [min(1, 'Field is required')]);
  let nameField = field<string>('', [required]);
  let simTemplateField = field<number | null>(null);
  let startTimeDoyField = field<string>('', [required, timestamp]);

  $: plans = data.plans;
  $: models = data.models;
  $: createButtonEnabled =
    $endTimeDoyField.dirtyAndValid &&
    $modelIdField.dirtyAndValid &&
    $nameField.dirtyAndValid &&
    $startTimeDoyField.dirtyAndValid;
  $: filteredPlans = plans.filter(plan => {
    const filterTextLowerCase = filterText.toLowerCase();
    return (
      plan.end_time_doy.includes(filterTextLowerCase) ||
      `${plan.id}`.includes(filterTextLowerCase) ||
      `${plan.model_id}`.includes(filterTextLowerCase) ||
      plan.name.toLowerCase().includes(filterTextLowerCase) ||
      plan.start_time_doy.includes(filterTextLowerCase)
    );
  });
  $: simulationTemplates.setVariables({ modelId: $modelIdField.value });

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
      $endTimeDoyField.value,
      $modelIdField.value,
      $nameField.value,
      $startTimeDoyField.value,
      $simTemplateField.value,
      data.user,
    );

    if (newPlan) {
      plans = [...plans, newPlan];
    }
  }

  async function deletePlan({ id }: Pick<Plan, 'id'>): Promise<void> {
    const success = await effects.deletePlan(id, data.user);

    if (success) {
      plans = plans.filter(plan => plan.id !== id);
    }
  }

  function deletePlanContext(event: CustomEvent<RowId[]>) {
    deletePlan({ id: event.detail[0] as number });
  }

  function prefetchPlan(plan?: Pick<Plan, 'id'>) {
    if (plan !== undefined) {
      preloadData(`${base}/plans/${plan.id}`);
    }
  }

  function showPlan(plan: Pick<Plan, 'id'>) {
    goto(`${base}/plans/${plan.id}`);
  }

  function onStartTimeChanged() {
    if ($startTimeDoyField.value && $startTimeDoyField.valid && $endTimeDoyField.value === '') {
      endTimeDoyField.set($startTimeDoyField);
    }
    updateDurationString();
  }

  function updateDurationString() {
    if ($startTimeDoyField.valid && $endTimeDoyField.valid) {
      durationString = convertUsToDurationString(
        (getUnixEpochTime($endTimeDoyField.value) - getUnixEpochTime($startTimeDoyField.value)) * 1000,
      );

      if (!durationString) {
        durationString = 'None';
      }
    } else {
      durationString = 'None';
    }
  }
</script>

<PageTitle title="Plans" />

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav>
    <span slot="title">Plans</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <SectionTitle>New Plan</SectionTitle>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={createPlan}>
          <AlertError class="m-2" error={$createPlanError} />

          <Field field={modelIdField}>
            <label for="model" slot="label">Models</label>
            <select
              class="st-select w-100"
              data-type="number"
              name="model"
              use:permissionHandler={{
                hasPermission: canCreate,
                permissionError,
              }}
            >
              <option value="-1" />
              {#each models as model}
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
              use:permissionHandler={{
                hasPermission: canCreate,
                permissionError,
              }}
            />
          </Field>

          <fieldset>
            <DatePickerField
              field={startTimeDoyField}
              label="Start Time - YYYY-DDDThh:mm:ss"
              name="start-time"
              on:change={onStartTimeChanged}
              on:keydown={updateDurationString}
              use={[
                [
                  permissionHandler,
                  {
                    hasPermission: canCreate,
                    permissionError,
                  },
                ],
              ]}
            />
          </fieldset>

          <fieldset>
            <DatePickerField
              field={endTimeDoyField}
              label="End Time - YYYY-DDDThh:mm:ss"
              name="end-time"
              on:change={updateDurationString}
              on:keydown={updateDurationString}
              use={[
                [
                  permissionHandler,
                  {
                    hasPermission: canCreate,
                    permissionError,
                  },
                ],
              ]}
            />
          </fieldset>

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
              use:permissionHandler={{
                hasPermission: canCreate,
                permissionError,
              }}
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
        <SectionTitle>
          <PlanIcon />
          Plans
        </SectionTitle>
        <Input>
          <input bind:value={filterText} class="st-input" placeholder="Filter plans" style="width: 300px" />
        </Input>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if filteredPlans.length}
          <SingleActionDataGrid
            {columnDefs}
            hasDeletePermission={featurePermissions.plan.canDelete}
            itemDisplayText="Plan"
            items={filteredPlans}
            user={data.user}
            on:cellMouseOver={({ detail }) => prefetchPlan(detail.data)}
            on:deleteItem={deletePlanContext}
            on:rowClicked={({ detail }) => showPlan(detail.data)}
          />
        {:else}
          No Plans Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>
