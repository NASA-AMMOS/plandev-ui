<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import PlanIcon from '@nasa-jpl/stellar/icons/plan.svg?component';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { flatten } from 'lodash-es';
  import { onDestroy, onMount } from 'svelte';
  import Nav from '../../components/app/Nav.svelte';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import DatePickerField from '../../components/form/DatePickerField.svelte';
  import Field from '../../components/form/Field.svelte';
  import Input from '../../components/form/Input.svelte';
  import ModelStatusRollup from '../../components/model/ModelStatusRollup.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import DataGridActions from '../../components/ui/DataGrid/DataGridActions.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../../components/ui/DataGrid/DataGridTags';
  import SingleActionDataGrid from '../../components/ui/DataGrid/SingleActionDataGrid.svelte';
  import IconCellRenderer from '../../components/ui/IconCellRenderer.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import SectionTitle from '../../components/ui/SectionTitle.svelte';
  import TagsInput from '../../components/ui/Tags/TagsInput.svelte';
  import { InvalidDate } from '../../constants/time';
  import { SearchParameters } from '../../enums/searchParameters';
  import { field } from '../../stores/form';
  import { models } from '../../stores/model';
  import { createPlanError, creatingPlan, resetPlanStores } from '../../stores/plan';
  import { plans } from '../../stores/plans';
  import { plugins } from '../../stores/plugins';
  import { simulationTemplates } from '../../stores/simulation';
  import { tags } from '../../stores/tags';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, RowId } from '../../types/data-grid';
  import type { ModelSlim } from '../../types/model';
  import type { DeprecatedPlanTransfer, Plan, PlanSlim, PlanTransfer } from '../../types/plan';
  import type { PlanTagsInsertInput, Tag, TagsChangeEvent } from '../../types/tags';
  import { generateRandomPastelColor } from '../../utilities/color';
  import effects from '../../utilities/effects';
  import { removeQueryParam } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { isDeprecatedPlanTransfer } from '../../utilities/plan';
  import {
    convertDoyToYmd,
    convertUsToDurationString,
    formatDate,
    getDoyTime,
    getDoyTimeFromInterval,
    getShortISOForDate,
  } from '../../utilities/time';
  import { min, required, unique } from '../../utilities/validators';
  import type { PageData } from './$types';

  export let data: PageData;

  type CellRendererParams = {
    deletePlan: (plan: Plan) => void;
  };
  type PlanCellRendererParams = ICellRendererParams<Plan> & CellRendererParams;

  /* eslint-disable sort-keys */
  const baseColumnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sort: 'desc',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 75,
    },
    { field: 'name', filter: 'text', headerName: 'Name', resizable: true, sortable: true },
    {
      field: 'model_id',
      filter: 'number',
      headerName: 'Model ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      width: 130,
    },
    {
      field: 'model_name',
      filter: 'text',
      headerName: 'Model Name',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        if (params.data?.model_id !== undefined) {
          return data.models.find(model => model.id === params.data?.model_id)?.name;
        }
      },
      width: 150,
    },
    {
      field: 'model_version',
      filter: 'text',
      headerName: 'Model Version',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        if (params.data?.model_id !== undefined) {
          return data.models.find(model => model.id === params.data?.model_id)?.version;
        }
      },
      width: 150,
    },
    {
      field: 'start_time',
      filter: 'text',
      headerName: 'Start Time',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        if (params.data) {
          return formatDate(new Date(params.data.start_time), $plugins.time.primary.formatShort);
        }
      },
      cellRenderer: (params: ICellRendererParams<Plan>) => {
        if (params.value !== InvalidDate) {
          return params.value;
        }
        const div = document.createElement('div');

        new IconCellRenderer({
          props: { type: 'error' },
          target: div,
        });

        return div;
      },
      width: 150,
    },
    {
      field: 'end_time',
      filter: 'text',
      headerName: 'End Time',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        if (params.data) {
          const endTime = convertDoyToYmd(params.data.end_time_doy);
          if (endTime) {
            return formatDate(new Date(endTime), $plugins.time.primary.formatShort);
          }
        }
      },
      cellRenderer: (params: ICellRendererParams<Plan>) => {
        if (params.value !== InvalidDate) {
          return params.value;
        }
        const div = document.createElement('div');

        new IconCellRenderer({
          props: { type: 'error' },
          target: div,
        });

        return div;
      },
      width: 140,
    },
    {
      field: 'created_at',
      filter: 'text',
      headerName: 'Date Created',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        if (params.data?.created_at) {
          return getShortISOForDate(new Date(params.data?.created_at));
        }
      },
      width: 200,
    },
    {
      field: 'updated_at',
      filter: 'text',
      headerName: 'Updated At',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        if (params.data?.updated_at) {
          return getShortISOForDate(new Date(params.data?.updated_at));
        }
      },
    },
    { field: 'updated_by', filter: 'text', headerName: 'Updated By', resizable: true, sortable: true, width: 150 },
    {
      autoHeight: true,
      cellRenderer: tagsCellRenderer,
      field: 'tags',
      filter: 'text',
      filterValueGetter: tagsFilterValueGetter,
      headerName: 'Tags',
      resizable: true,
      sortable: false,
      width: 220,
      wrapText: true,
    },
  ];
  const permissionError: string = 'You do not have permission to create a plan';

  let canCreate: boolean = false;
  let columnDefs: DataGridColumnDef[] = baseColumnDefs;
  let durationString: string = 'None';
  let filterText: string = '';
  let orderedModels: ModelSlim[] = [];
  let nameInputField: HTMLInputElement;
  let planTags: Tag[] = [];
  let selectedModel: ModelSlim | undefined;
  let user: User | null = null;

  let modelIdField = field<number>(-1, [min(1, 'Field is required')]);
  let nameField = field<string>('', [
    required,
    unique(
      $plans.map(plan => plan.name),
      'Plan name already exists',
    ),
  ]);
  let planUploadFiles: FileList | undefined;
  let fileInput: HTMLInputElement;
  let simTemplateField = field<number | null>(null);

  $: startTimeField = field<string>('', [required, $plugins.time.primary.validate]);
  $: endTimeField = field<string>('', [required, $plugins.time.primary.validate]);

  $: if ($plans) {
    nameField.updateValidators([
      required,
      unique(
        $plans.map(plan => plan.name),
        'Plan name already exists',
      ),
    ]);
  }
  $: models.updateValue(() => data.models);
  // sort in descending ID order
  $: orderedModels = [...$models].sort(({ id: idA }, { id: idB }) => {
    if (idA < idB) {
      return 1;
    }
    if (idA > idB) {
      return -1;
    }
    return 0;
  });
  $: {
    user = data.user;
    canCreate = user ? featurePermissions.plan.canCreate(user) : false;
    columnDefs = [
      ...baseColumnDefs,
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
              hasDeletePermission: params.data && user ? featurePermissions.plan.canDelete(user, params.data) : false,
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
  }
  $: createButtonEnabled =
    $endTimeField.dirtyAndValid &&
    $modelIdField.dirtyAndValid &&
    $nameField.dirtyAndValid &&
    $startTimeField.dirtyAndValid;
  $: filteredPlans = $plans.filter(plan => {
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
  $: selectedModel = $models.find(({ id }) => $modelIdField.value === id);

  onMount(() => {
    const queryModelId = $page.url.searchParams.get(SearchParameters.MODEL_ID);
    if (queryModelId) {
      $modelIdField.value = parseFloat(queryModelId);
      modelIdField.validateAndSet(parseFloat(queryModelId));
      removeQueryParam(SearchParameters.MODEL_ID);
      if (nameInputField) {
        nameInputField.focus();
      }
    }
  });

  onDestroy(() => {
    resetPlanStores();
  });

  async function createPlan() {
    const startTimeDate = $plugins.time.primary.parse($startTimeField.value);
    const endTimeDate = $plugins.time.primary.parse($endTimeField.value);
    if (!startTimeDate || !endTimeDate) {
      return;
    }
    let startTime = getDoyTime(startTimeDate);
    let endTime = getDoyTime(endTimeDate);
    if (planUploadFiles && planUploadFiles.length) {
      await effects.importPlan(
        $nameField.value,
        $modelIdField.value,
        startTime,
        endTime,
        $simTemplateField.value,
        planTags.map(({ id }) => id),
        planUploadFiles,
        user,
      );
      fileInput.value = '';
      planUploadFiles = undefined;
      $startTimeField.value = '';
      $endTimeField.value = '';
      $nameField.value = '';
    } else {
      const newPlan: PlanSlim | null = await effects.createPlan(
        endTime,
        $modelIdField.value,
        $nameField.value,
        startTime,
        $simTemplateField.value,
        user,
      );
      if (newPlan) {
        // Associate new tags with plan
        const newPlanTags: PlanTagsInsertInput[] = (planTags || []).map(({ id: tag_id }) => ({
          plan_id: newPlan.id,
          tag_id,
        }));
        newPlan.tags = planTags.map(tag => ({ tag }));
        if (!$plans.find(({ id }) => newPlan.id === id)) {
          plans.updateValue(storePlans => [...storePlans, newPlan]);
        }
        await effects.createPlanTags(newPlanTags, newPlan, user);
        $startTimeField.value = '';
        $endTimeField.value = '';
        $nameField.value = '';
      }
    }
  }

  async function deletePlan(plan: PlanSlim): Promise<void> {
    const success = await effects.deletePlan(plan, user);

    if (success) {
      plans.updateValue(storePlans => storePlans.filter(p => plan.id !== p.id));
    }
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      planTags = planTags.filter(t => t.name !== tag.name);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      planTags = planTags.concat(tagsToAdd);
    }
  }

  function deletePlanContext(event: CustomEvent<RowId[]>, plans: PlanSlim[]) {
    const id = event.detail[0] as number;
    const plan = plans.find(t => t.id === id);
    if (plan) {
      deletePlan(plan);
    }
  }

  function showPlan(plan: Pick<Plan, 'id'>) {
    goto(`${base}/plans/${plan.id}`);
  }

  async function onStartTimeChanged() {
    if ($startTimeField.value && $startTimeField.valid && $endTimeField.value === '') {
      // Set end time as start time plus a day by default
      const startTimeDate = $plugins.time.primary.parse($startTimeField.value);
      if (startTimeDate) {
        const defaultDate = $plugins.time.getDefaultPlanEndDate(startTimeDate);
        if (defaultDate) {
          let newEndTime = formatDate(defaultDate, $plugins.time.primary.format);
          if (newEndTime !== InvalidDate) {
            await endTimeField.validateAndSet(newEndTime);
          }
        }
      }
    }

    updateDurationString();
  }

  function updateDurationString() {
    if ($startTimeField.valid && $endTimeField.valid) {
      let startTimeMs = $plugins.time.primary.parse($startTimeField.value)?.getTime();
      let endTimeMs = $plugins.time.primary.parse($endTimeField.value)?.getTime();
      if (typeof startTimeMs === 'number' && typeof endTimeMs === 'number') {
        durationString = convertUsToDurationString((endTimeMs - startTimeMs) * 1000);

        if (!durationString) {
          durationString = 'None';
        }
      } else {
        durationString = 'Invalid';
      }
    } else {
      durationString = 'None';
    }
  }
  async function onReaderLoad(event: ProgressEvent<FileReader>) {
    if (event.target !== null && event.target.result !== null) {
      const planJSON: PlanTransfer | DeprecatedPlanTransfer = JSON.parse(`${event.target.result}`) as
        | PlanTransfer
        | DeprecatedPlanTransfer;
      nameField.validateAndSet(planJSON.name);
      const importedPlanTags = (planJSON.tags ?? []).reduce(
        (previousTags: { existingTags: Tag[]; newTags: Pick<Tag, 'color' | 'name'>[] }, importedPlanTag) => {
          const {
            tag: { color: importedPlanTagColor, name: importedPlanTagName },
          } = importedPlanTag;
          const existingTag = $tags.find(({ name }) => importedPlanTagName === name);

          if (existingTag) {
            return {
              ...previousTags,
              existingTags: [...previousTags.existingTags, existingTag],
            };
          } else {
            return {
              ...previousTags,
              newTags: [
                ...previousTags.newTags,
                {
                  color: importedPlanTagColor,
                  name: importedPlanTagName,
                },
              ],
            };
          }
        },
        {
          existingTags: [],
          newTags: [],
        },
      );

      const newTags: Tag[] = flatten(
        await Promise.all(
          importedPlanTags.newTags.map(async ({ color: tagColor, name: tagName }) => {
            return (
              (await effects.createTags([{ color: tagColor ?? generateRandomPastelColor(), name: tagName }], user)) ||
              []
            );
          }),
        ),
      );

      planTags = [...importedPlanTags.existingTags, ...newTags];

      // remove the `+00:00` timezone before parsing
      const startTime = `${convertDoyToYmd(planJSON.start_time.replace(/\+00:00/, ''))}`;
      await startTimeField.validateAndSet(getDoyTime(new Date(startTime), true));

      if (isDeprecatedPlanTransfer(planJSON)) {
        await endTimeField.validateAndSet(
          getDoyTime(new Date(`${convertDoyToYmd(planJSON.end_time.replace(/\+00:00/, ''))}`), true),
        );
      } else {
        const { duration } = planJSON;

        await endTimeField.validateAndSet(getDoyTimeFromInterval(startTime, duration));
      }

      updateDurationString();
    }
  }

  function onPlanFileChange(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files !== null && files.length) {
      const reader = new FileReader();
      reader.onload = onReaderLoad;
      reader.readAsText(files[0]);
    }
  }
</script>

<PageTitle title="Plans" />

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav {user}>
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

          <fieldset>
            <label for="file">Import Plan JSON File</label>
            <input
              class="w-100"
              name="file"
              type="file"
              bind:files={planUploadFiles}
              bind:this={fileInput}
              use:permissionHandler={{
                hasPermission: canCreate,
                permissionError,
              }}
              on:change={onPlanFileChange}
            />
          </fieldset>

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
              {#each orderedModels as model (model.id)}
                <option value={model.id}>
                  {model.name}
                  (Version: {model.version})
                </option>
              {/each}
            </select>
          </Field>
          {#if selectedModel}
            <div class="model-status">
              <ModelStatusRollup mode="rollup" model={selectedModel} showCompleteStatus />
            </div>
          {/if}

          <Field field={nameField}>
            <label for="name" slot="label">Name</label>
            <input
              bind:this={nameInputField}
              autocomplete="off"
              class="st-input w-100"
              name="name"
              aria-label="name"
              use:permissionHandler={{
                hasPermission: canCreate,
                permissionError,
              }}
            />
          </Field>

          <fieldset>
            <DatePickerField
              layout="stacked"
              useFallback={!$plugins.time.enableDatePicker}
              field={startTimeField}
              label={`Start Time - ${$plugins.time.primary.formatString}`}
              name="start-time"
              on:change={onStartTimeChanged}
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
              useFallback={!$plugins.time.enableDatePicker}
              field={endTimeField}
              label={`End Time - ${$plugins.time.primary.formatString}`}
              name="end-time"
              on:change={updateDurationString}
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
            <label for="plan-duration">Tags</label>
            <TagsInput
              use={[
                [
                  permissionHandler,
                  {
                    hasPermission: canCreate,
                    permissionError,
                  },
                ],
              ]}
              options={$tags}
              selected={planTags}
              on:change={onTagsInputChange}
            />
          </fieldset>

          <fieldset>
            <button
              class="st-button w-100"
              disabled={!createButtonEnabled}
              type="submit"
              use:permissionHandler={{
                hasPermission: canCreate,
                permissionError,
              }}
            >
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
        <Input layout="inline">
          <input bind:value={filterText} class="st-input" placeholder="Filter plans" style="width: 300px" />
        </Input>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if filteredPlans && filteredPlans.length}
          <SingleActionDataGrid
            {columnDefs}
            hasDeletePermission={featurePermissions.plan.canDelete}
            itemDisplayText="Plan"
            items={filteredPlans}
            {user}
            on:deleteItem={event => deletePlanContext(event, filteredPlans)}
            on:rowClicked={({ detail }) => showPlan(detail.data)}
          />
        {:else}
          No Plans Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>

<style>
  .model-status {
    padding: 5px 16px 0;
  }
</style>
