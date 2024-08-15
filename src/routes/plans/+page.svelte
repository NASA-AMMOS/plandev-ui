<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import PlanIcon from '@nasa-jpl/stellar/icons/plan.svg?component';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import { flatten } from 'lodash-es';
  import { onDestroy, onMount } from 'svelte';
  import ExportIcon from '../../assets/export.svg?component';
  import ImportIcon from '../../assets/import.svg?component';
  import Nav from '../../components/app/Nav.svelte';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import DatePickerField from '../../components/form/DatePickerField.svelte';
  import Field from '../../components/form/Field.svelte';
  import Input from '../../components/form/Input.svelte';
  import ModelStatusRollup from '../../components/model/ModelStatusRollup.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import CancellableProgressRadial from '../../components/ui/CancellableProgressRadial.svelte';
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
  import { parseJSONStream, removeQueryParam } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { exportPlan, isDeprecatedPlanTransfer } from '../../utilities/plan';
  import {
    convertDoyToYmd,
    convertUsToDurationString,
    formatDate,
    getDoyTime,
    getDoyTimeFromInterval,
    getIntervalInMs,
    getShortISOForDate,
  } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { min, required, unique } from '../../utilities/validators';
  import type { PageData } from './$types';

  export let data: PageData;

  type CellRendererParams = {
    deletePlan: (plan: Plan) => void;
    exportPlan: (plan: Plan, progressCallback?: (progress: number) => void, signal?: AbortSignal) => void;
    viewPlan: (plan: Plan) => void;
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
  let createPlanButtonText: string = 'Create';
  let durationString: string = 'None';
  let filterText: string = '';
  let isPlanImportMode: boolean = false;
  let orderedModels: ModelSlim[] = [];
  let nameInputField: HTMLInputElement;
  let planTags: Tag[] = [];
  let planExportAbortController: AbortController | null = null;
  let planExportProgress: number | null = null;
  let selectedModel: ModelSlim | undefined;
  let selectedPlan: PlanSlim | undefined;
  let selectedPlanId: number | null = null;
  let selectedPlanModelName: string | null = null;
  let selectedPlanStartTime: string | null = null;
  let selectedPlanEndTime: string | null = null;
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
  let planUploadFilesError: string | null = null;
  let planUploadFileInput: HTMLInputElement;
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

    selectedPlan = $plans.find(({ id }) => id === selectedPlanId);
    if (selectedPlan) {
      try {
        const parsedPlanStartTime = $plugins.time.primary.parse(selectedPlan?.start_time_doy);
        const parsedPlanEndTime = $plugins.time.primary.parse(selectedPlan?.end_time_doy);
        if (parsedPlanStartTime) {
          selectedPlanStartTime = formatDate(parsedPlanStartTime, $plugins.time.primary.format);
        }
        if (parsedPlanEndTime) {
          selectedPlanEndTime = formatDate(parsedPlanEndTime, $plugins.time.primary.format);
        }
      } catch (e) {
        console.log(e);
      }
      selectedPlanModelName = $models.find(model => model.id === selectedPlan?.model_id)?.name ?? null;
    }
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
      ...baseColumnDefs.slice(0, 3),
      {
        field: 'model_name',
        filter: 'text',
        headerName: 'Model Name',
        resizable: true,
        sortable: true,
        valueGetter: (params: ValueGetterParams<Plan>) => {
          if (params.data?.model_id !== undefined) {
            return $models.find(model => model.id === params.data?.model_id)?.name;
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
            return $models.find(model => model.id === params.data?.model_id)?.version;
          }
        },
        width: 150,
      },
      ...baseColumnDefs.slice(3),
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
              downloadCallback: params.exportPlan,
              downloadTooltip: {
                content: 'Export Plan',
                placement: 'bottom',
              },
              useExportIcon: true,
              hasDeletePermission: params.data && user ? featurePermissions.plan.canDelete(user, params.data) : false,
              rowData: params.data,
              viewCallback: data => user && params.viewPlan(data),
              viewTooltip: {
                content: 'Open Plan',
                placement: 'bottom',
              },
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          deletePlan,
          exportPlan: onExportPlan,
          viewPlan,
        } as CellRendererParams,
        field: 'actions',
        headerName: '',
        resizable: false,
        sortable: false,
        suppressAutoSize: true,
        suppressSizeToFit: true,
        width: 80,
      },
    ];
  }
  $: createButtonEnabled =
    $endTimeField.dirtyAndValid &&
    $modelIdField.dirtyAndValid &&
    $nameField.dirtyAndValid &&
    $startTimeField.dirtyAndValid &&
    !$creatingPlan;
  $: if ($creatingPlan) {
    createPlanButtonText = planUploadFiles ? 'Creating from .json...' : 'Creating...';
  } else {
    createPlanButtonText = planUploadFiles ? 'Create from .json' : 'Create';
  }
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
      planUploadFileInput.value = '';
      planUploadFiles = undefined;
      startTimeField.reset('');
      endTimeField.reset('');
      nameField.reset('');
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
        startTimeField.reset('');
        endTimeField.reset('');
        nameField.reset('');
      }
    }
  }

  async function deletePlan(plan: PlanSlim): Promise<void> {
    const success = await effects.deletePlan(plan, user);

    if (success) {
      plans.updateValue(storePlans => storePlans.filter(p => plan.id !== p.id));
    }
  }

  function deselectPlan() {
    selectPlan(null);
  }

  async function onExportPlan(
    plan: PlanSlim,
    progressCallback: (progress: number) => void,
    signal: AbortSignal,
  ): Promise<void> {
    await exportPlan(plan, user, progressCallback, undefined, signal);
  }

  async function onExportSelectedPlan() {
    if (selectedPlan) {
      if (planExportAbortController) {
        planExportAbortController.abort();
      }

      planExportProgress = 0;
      planExportAbortController = new AbortController();

      if (planExportAbortController && !planExportAbortController.signal.aborted) {
        await onExportPlan(
          selectedPlan,
          (progress: number) => {
            planExportProgress = progress;
          },
          planExportAbortController.signal,
        );
      }
      planExportProgress = null;
    }
  }

  function onCancelExportSelectedPlan() {
    planExportAbortController?.abort();
    planExportAbortController = null;
    planExportProgress = null;
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

  function openPlan(planId: number) {
    goto(`${base}/plans/${planId}`);
  }

  function viewPlan(plan: Plan) {
    openPlan(plan.id);
  }

  function showSelectedPlan() {
    if (selectedPlanId !== null) {
      openPlan(selectedPlanId);
    }
  }

  function hideImportPlan() {
    isPlanImportMode = false;
    planUploadFileInput.value = '';
    planUploadFiles = undefined;
    planUploadFilesError = null;
  }

  function showImportPlan() {
    isPlanImportMode = true;
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

  async function parsePlanFileStream(stream: ReadableStream) {
    planUploadFilesError = null;
    try {
      let planJSON: PlanTransfer | DeprecatedPlanTransfer;
      try {
        planJSON = await parseJSONStream<PlanTransfer | DeprecatedPlanTransfer>(stream);
      } catch (e) {
        throw new Error('Plan file is not valid JSON');
      }

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
    } catch (e) {
      planUploadFilesError = (e as Error).message;
    }
  }

  function onPlanFileChange(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files !== null && files.length) {
      const file = files[0];
      if (/\.json$/.test(file.name)) {
        parsePlanFileStream(file.stream());
      } else {
        planUploadFilesError = 'Plan file is not a .json file';
      }
    }
  }

  function selectPlan(planId: number | null) {
    selectedPlanId = planId;
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
        {#if selectedPlan}
          <SectionTitle>Selected plan</SectionTitle>
          <div class="selected-plan-buttons">
            <div class="transfer-button-container">
              {#if planExportProgress !== null}
                <button
                  class="cancel-button"
                  on:click={onCancelExportSelectedPlan}
                  use:tooltip={{
                    content: 'Cancel Plan Export',
                    placement: 'top',
                  }}
                >
                  <CancellableProgressRadial progress={planExportProgress} />
                </button>
              {/if}
              <button
                class="st-button secondary transfer-button"
                disabled={planExportProgress !== null}
                on:click={onExportSelectedPlan}
                use:tooltip={{
                  content: 'Export Selected Plan',
                  placement: 'top',
                }}
              >
                <ExportIcon /> Export{#if planExportProgress !== null}ing...{/if}
              </button>
            </div>
            <button
              class="st-button icon fs-6"
              on:click={deselectPlan}
              use:tooltip={{ content: 'Deselect plan', placement: 'top' }}
            >
              <XIcon />
            </button>
          </div>
        {:else}
          <SectionTitle>New Plan</SectionTitle>
          <button
            class="st-button secondary transfer-button"
            type="button"
            on:click={isPlanImportMode ? hideImportPlan : showImportPlan}
          >
            <ImportIcon /> Import
          </button>
        {/if}
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if selectedPlan}
          <div class="plan-metadata">
            <fieldset>
              <Input layout="inline">
                <label class="plan-metadata-item-label" for="name">Model</label>
                <input
                  disabled
                  class="st-input w-100"
                  name="name"
                  use:tooltip={{ content: selectedPlanModelName, placement: 'top' }}
                  value={selectedPlanModelName}
                />
              </Input>
              <Input layout="inline">
                <label class="plan-metadata-item-label" for="id">Name</label>
                <input disabled class="st-input w-100" name="id" value={selectedPlan.name} />
              </Input>
              <Input layout="inline">
                <label class="plan-metadata-item-label" for="start-time">
                  Start Time - {$plugins.time.primary.label}
                </label>
                <input disabled class="st-input w-100" name="start-time" value={selectedPlanStartTime} />
              </Input>
              <Input layout="inline">
                <label class="plan-metadata-item-label" for="end-time">
                  End Time - {$plugins.time.primary.label}
                </label>
                <input disabled class="st-input w-100" name="end-time" value={selectedPlanEndTime} />
              </Input>
              <Input layout="inline">
                <label class="plan-metadata-item-label" for="duration"> Plan Duration </label>
                <input
                  disabled
                  class="st-input w-100"
                  name="duration"
                  value={convertUsToDurationString(getIntervalInMs(selectedPlan.duration) * 1000)}
                />
              </Input>
              <Input layout="inline">
                <label class="plan-metadata-item-label" for="tags">Tags</label>
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
                  disabled
                  options={$tags}
                  selected={selectedPlan.tags.map(({ tag }) => tag)}
                  on:change={onTagsInputChange}
                />
              </Input>
            </fieldset>
          </div>
          <fieldset>
            <button class="st-button w-100" on:click={showSelectedPlan}>Open plan</button>
          </fieldset>
        {:else}
          <form on:submit|preventDefault={createPlan}>
            <AlertError class="m-2" error={$createPlanError} />

            <fieldset class="plan-import-container" hidden={!isPlanImportMode}>
              <button class="close-import" type="button" on:click={hideImportPlan}>
                <CloseIcon />
              </button>
              <label for="file">Plan File (JSON)</label>
              <div class="import-input-container">
                <input
                  class="w-100"
                  name="file"
                  type="file"
                  accept="application/json"
                  bind:files={planUploadFiles}
                  bind:this={planUploadFileInput}
                  use:permissionHandler={{
                    hasPermission: canCreate,
                    permissionError,
                  }}
                  on:change={onPlanFileChange}
                />
              </div>
              {#if planUploadFilesError}
                <div class="error">{planUploadFilesError}</div>
              {/if}
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
                {createPlanButtonText}
              </button>
            </fieldset>
          </form>
        {/if}
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
            selectedItemId={selectedPlanId ?? null}
            on:deleteItem={event => deletePlanContext(event, filteredPlans)}
            on:rowClicked={({ detail }) => selectPlan(detail.data.id)}
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

  .plan-import-container {
    background: var(--st-gray-15);
    border-radius: 5px;
    margin: 5px;
    padding: 8px 11px 8px;
    position: relative;
  }

  .plan-import-container[hidden] {
    display: none;
  }

  .transfer-button-container {
    display: grid;
    grid-template-columns: auto auto;
    position: relative;
  }

  .transfer-button {
    column-gap: 4px;
    position: relative;
  }

  .cancel-button {
    background: none;
    border: 0;
  }

  .import-input-container {
    column-gap: 0.5rem;
    display: grid;
    grid-template-columns: auto min-content;
  }

  .close-import {
    background: none;
    border: 0;
    cursor: pointer;
    height: 1.3rem;
    padding: 0;
    position: absolute;
    right: 3px;
    top: 3px;
  }

  .error {
    color: var(--st-red);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selected-plan-buttons {
    column-gap: 0.25rem;
    display: grid;
    grid-template-columns: repeat(2, min-content);
  }

  .plan-metadata-item-label {
    white-space: nowrap;
  }
</style>
