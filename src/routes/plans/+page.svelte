<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { Alert, Button, cn, Input as InputStellar, Label, Select } from '@nasa-jpl/stellar-svelte';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { flatten } from 'lodash-es';
  import { FileUp, Import, LoaderCircle, LockKeyhole, Pencil, TriangleAlert, X } from 'lucide-svelte';
  import { onDestroy, onMount } from 'svelte';
  import Nav from '../../components/app/Nav.svelte';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Collapse from '../../components/Collapse.svelte';
  import DatePickerField from '../../components/form/DatePickerField.svelte';
  import Field from '../../components/form/Field.svelte';
  import ModelStatusRollup from '../../components/model/ModelStatusRollup.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import CssGridGutter from '../../components/ui/CssGridGutter.svelte';
  import DataGridActions from '../../components/ui/DataGrid/DataGridActions.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../../components/ui/DataGrid/DataGridTags';
  import SingleActionDataGrid from '../../components/ui/DataGrid/SingleActionDataGrid.svelte';
  import IconCellRenderer from '../../components/ui/IconCellRenderer.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import PlanName from '../../components/ui/PlanName.svelte';
  import SectionTitle from '../../components/ui/SectionTitle.svelte';
  import TagsInput from '../../components/ui/Tags/TagsInput.svelte';
  import { InvalidDate } from '../../constants/time';
  import { PlanImportStatus, PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SearchParameters } from '../../enums/searchParameters';
  import { field } from '../../stores/form';
  import { executableModels, models } from '../../stores/model';
  import { createPlanError, creatingPlan, resetPlanStores } from '../../stores/plan';
  import { planImportRequests, planImportRequestsMap, plans } from '../../stores/plans';
  import { plugins } from '../../stores/plugins';
  import { simulationTemplates } from '../../stores/simulation';
  import { tags } from '../../stores/tags';
  import { getUserStore } from '../../stores/user';
  import type { DataGridColumnDef, RowId } from '../../types/data-grid';
  import type { FieldStore } from '../../types/form';
  import type { ModelSlim } from '../../types/model';
  import type { DeprecatedPlanTransfer, Plan, PlanSlim, PlanTransfer } from '../../types/plan';
  import type { PlanTagsInsertInput, Tag, TagsChangeEvent } from '../../types/tags';
  import { generateRandomPastelColor } from '../../utilities/color';
  import effects from '../../utilities/effects';
  import { compareWithRankings, parseJSONStream } from '../../utilities/generic';
  import { showChangePlanBoundsModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import {
    assertPlanTransferFields,
    computeDurationString,
    exportPlan,
    isDeprecatedPlanTransfer,
  } from '../../utilities/plan';
  import {
    convertDoyToYmd,
    convertUsToDurationString,
    formatDate,
    getDoyTime,
    getDoyTimeFromInterval,
    getIntervalInMs,
    getShortISOForDate,
  } from '../../utilities/time';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import { tooltip } from '../../utilities/tooltip';
  import { removeQueryParam } from '../../utilities/url';
  import { min, required, unique } from '../../utilities/validators';
  import type { PageData } from './$types';

  export let data: PageData;

  type CellRendererParams = {
    deletePlan: (plan: Plan) => void;
    exportPlan: (plan: Plan) => void;
    viewPlan: (plan: Plan) => void;
  };
  type PlanCellRendererParams = ICellRendererParams<Plan> & CellRendererParams;

  const plansLoading = plans.loading;
  const MIN_PANEL_WIDTH = 300;
  const MIN_TABLE_WIDTH = 500;

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
    {
      cellRenderer: (params: ICellRendererParams<Plan>) => {
        const div = document.createElement('div');
        let isExecutable = true;
        if (params.data?.model_id !== undefined) {
          const associatedModel = $models.find(model => model.id === params.data?.model_id);
          if (associatedModel) {
            isExecutable = associatedModel.is_executable;
          }
        }
        const importStatus = $planImportRequestsMap[params.data?.id ?? -1]?.status ?? null;
        new PlanName({
          props: {
            name: params.data?.name || '',
            isReadOnly: !isExecutable,
            importStatus: importStatus === PlanImportStatus.COMPLETE ? null : importStatus,
            importError: 'Import failed: select plan for details',
          },
          target: div,
        });
        return div;
      },
      field: 'name',
      filter: 'text',
      flex: 4,
      headerName: 'Name',
      resizable: true,
      sortable: true,
      minWidth: 220,
    },
    {
      comparator: (
        valueA: number | string | null | undefined,
        valueB: number | string | null | undefined,
        _nodeA,
        _nodeB,
        isDescending: boolean,
      ) => {
        return compareWithRankings(valueA, valueB, isDescending ? ['', '-', 'number'] : ['number', '-', '']);
      },
      field: 'model_id',
      filter: 'number',
      headerName: 'Model ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        let value: string | number = '';
        if (params.data?.model_id !== undefined) {
          const associatedModel = $models.find(model => model.id === params.data?.model_id);
          if (associatedModel) {
            value = associatedModel.is_executable ? associatedModel.id : '-';
          }
        }

        return value;
      },
      flex: 1,
      minWidth: 95,
    },
    {
      comparator: (
        valueA: number | string | null | undefined,
        valueB: number | string | null | undefined,
        _nodeA,
        _nodeB,
        isDescending: boolean,
      ) => {
        return compareWithRankings(valueA, valueB, isDescending ? ['', 'N/A', 'string'] : ['string', 'N/A', '']);
      },
      field: 'model_name',
      filter: 'text',
      flex: 1,
      headerName: 'Model Name',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        if (params.data?.model_id !== undefined) {
          const associatedModel = $models.find(model => model.id === params.data?.model_id);
          if (associatedModel) {
            return associatedModel.is_executable ? associatedModel.name : '-';
          }
        }
        return '';
      },
      minWidth: 120,
    },
    {
      comparator: (
        valueA: number | string | null | undefined,
        valueB: number | string | null | undefined,
        _nodeA,
        _nodeB,
        isDescending: boolean,
      ) => {
        return compareWithRankings(valueA, valueB, isDescending ? ['', '-', 'string'] : ['string', '-', '']);
      },
      field: 'model_version',
      filter: 'text',
      flex: 1,
      headerName: 'Model Version',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        if (params.data?.model_id !== undefined) {
          const associatedModel = $models.find(model => model.id === params.data?.model_id);
          if (associatedModel) {
            if (associatedModel.is_executable) {
              return associatedModel.version;
            } else {
              return '-';
            }
          }
        }
        return '';
      },
      minWidth: 130,
    },
    {
      field: 'start_time',
      filter: 'text',
      flex: 1,
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
      minWidth: 105,
    },
    {
      field: 'end_time',
      filter: 'text',
      flex: 1,
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
      minWidth: 105,
    },
    {
      field: 'created_at',
      filter: 'text',
      flex: 1,
      headerName: 'Date Created',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        if (params.data?.created_at) {
          return getShortISOForDate(new Date(params.data?.created_at));
        }
      },
      minWidth: 120,
    },
    {
      field: 'updated_at',
      filter: 'text',
      flex: 1,
      headerName: 'Updated At',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Plan>) => {
        if (params.data?.updated_at) {
          return getShortISOForDate(new Date(params.data?.updated_at));
        }
      },
      minWidth: 110,
    },
    {
      field: 'updated_by',
      filter: 'text',
      flex: 1,
      headerName: 'Updated By',
      resizable: true,
      sortable: true,
      minWidth: 110,
    },
    {
      autoHeight: true,
      cellRenderer: tagsCellRenderer,
      field: 'tags',
      filter: 'text',
      filterValueGetter: tagsFilterValueGetter,
      flex: 1,
      headerName: 'Tags',
      minWidth: 75,
      resizable: true,
      sortable: false,
    },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: PlanCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        const importRequest = $planImportRequestsMap[params.data?.id ?? -1];
        const importIncomplete = !!importRequest && importRequest.status !== PlanImportStatus.COMPLETE;
        new DataGridActions({
          props: {
            deleteCallback: params.deletePlan,
            deleteTooltip: {
              content: 'Delete Plan',
              placement: 'bottom',
            },
            downloadCallback: params.exportPlan,
            downloadTooltip: {
              content: importIncomplete ? 'Import is incomplete – export is unavailable' : 'Export Plan',
              placement: 'bottom',
            },
            isDownloadCancellable: true,
            useExportIcon: true,
            hasDeletePermission: params.data && $user ? featurePermissions.plan.canDelete($user, params.data) : false,
            rowData: params.data,
            viewCallback: data => $user && params.viewPlan(data),
            viewTooltip: {
              content: 'Open Plan',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });

        if (importIncomplete) {
          const exportButton = actionsDiv.querySelector<HTMLButtonElement>('button.download');
          exportButton?.setAttribute('disabled', '');
          exportButton?.setAttribute('title', 'Import is incomplete – export is unavailable');
        }

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
  const permissionError: string = 'You do not have permission to create a plan';
  const user = getUserStore();

  let canCreate: boolean = false;
  let canChangePlanModel: boolean = false;
  let canUpdatePlan: boolean = false;
  let columnDefs: DataGridColumnDef[] = baseColumnDefs;
  let createButtonEnabled: boolean = false;
  let createPlanButtonText: string = 'Create';
  let durationString: string = 'None';
  let filterText: string = '';
  // This array should only be mutated to avoid extra re-renders. It is not needed for rendering as $planImportRequests will
  // be used to track the status of the import requests and retrigger a render
  let currentImportRequests: { planName: string; requestId: number }[] = [];
  let isPlanImportMode: boolean = false;
  let isPlanUploadReadOnly: boolean = false;
  let isLoadingPlanFile: boolean = false;
  let isSelectedPlanReadOnly: boolean = false;
  let orderedModels: ModelSlim[] = [];
  let nameInputField: InputStellar;
  let planExporting: boolean = false;
  let plansTable: SingleActionDataGrid<PlanSlim>;
  let planTags: Tag[] = [];
  let selectedModel: ModelSlim | undefined;
  let selectedPlan: PlanSlim | undefined;
  let selectedPlanId: number | null = null;
  let selectedPlanModelName: string | null = null;
  let panelColumns = '300px 3px 1fr';
  let startTimeField: FieldStore<string>;
  let endTimeField: FieldStore<string>;
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
  $: canChangePlanModel = selectedPlan !== undefined && featurePermissions.plan.canUpdateModel($user, selectedPlan);
  $: canUpdatePlan =
    selectedPlan !== undefined && $user ? featurePermissions.plan.canUpdate($user, selectedPlan) : false;

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
      selectedPlanModelName = $models.find(model => model.id === selectedPlan?.model_id)?.name ?? null;
    }
  }
  $: plans.updateValue(() => data.plans);
  $: models.updateValue(() => data.models);
  $: executableModels.updateValue(() => data.models.filter(model => model.is_executable));

  $: selectedPlanImportRequest =
    selectedPlan && $planImportRequestsMap[selectedPlan.id]?.status !== PlanImportStatus.COMPLETE
      ? ($planImportRequestsMap[selectedPlan.id] ?? null)
      : null;
  $: isSelectedPlanReadOnly = selectedPlan !== undefined && (selectedPlan.is_read_only || !!selectedPlanImportRequest);
  $: isSelectedPlanImporting =
    selectedPlanImportRequest !== null && selectedPlanImportRequest.status !== PlanImportStatus.FAILED;

  $: {
    const finishRequestsIds: number[] = [];
    currentImportRequests.forEach(({ planName, requestId }) => {
      const request = $planImportRequests.find(request => request.id === requestId);
      if (request?.status === PlanImportStatus.FAILED) {
        finishRequestsIds.push(requestId);
        showFailureToast(`Plan import failed for "${planName}": ${request.reason?.message ?? 'Unknown error'}`);
      } else if (request === undefined) {
        // Treat the request as completed if it's not found because "complete" requests are filtered out in the query
        finishRequestsIds.push(requestId);
        showSuccessToast(`Plan import completed for "${planName}"`);
      }
    });

    // Remove finished requests so we're not tracking them unnecessarily
    finishRequestsIds.forEach(requestId => {
      const index = currentImportRequests.findIndex(request => request.requestId === requestId);
      if (index !== -1) {
        // Mutate the array in place to prevent retriggering this reactive statement
        currentImportRequests.splice(index, 1);
      }
    });
  }

  // sort in descending ID order
  $: orderedModels = [...$executableModels].sort(({ id: idA }, { id: idB }) => {
    if (idA < idB) {
      return 1;
    }
    if (idA > idB) {
      return -1;
    }
    return 0;
  });

  $: canCreate = $user ? featurePermissions.plan.canCreate($user) : false;

  $: {
    void $planImportRequestsMap;
    plansTable?.dataGrid?.refreshCells({ columns: ['name'], force: true });
    plansTable?.dataGrid?.refreshCells({ columns: ['actions'], force: true });
  }
  $: {
    void $models;
    plansTable?.dataGrid?.refreshCells({ columns: ['model_id', 'model_name', 'model_version'], force: true });
  }

  $: {
    void $user;
    void featurePermissions;
    plansTable?.dataGrid?.refreshCells({ columns: ['actions'], force: true });
  }

  $: createButtonEnabled =
    !$plansLoading &&
    $endTimeField.dirtyAndValid &&
    (isPlanUploadReadOnly || (!isPlanUploadReadOnly && $modelIdField.dirtyAndValid)) &&
    $nameField.dirtyAndValid &&
    $startTimeField.dirtyAndValid &&
    !planUploadFilesError &&
    !$creatingPlan &&
    !isLoadingPlanFile;
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
  $: if (typeof $modelIdField.value === 'number') {
    simTemplateField.reset(null);
  }

  onMount(() => {
    const queryModelId = $page.url.searchParams.get(SearchParameters.MODEL_ID);
    if (queryModelId) {
      $modelIdField.value = parseFloat(queryModelId);
      modelIdField.validateAndSet(parseFloat(queryModelId));
      removeQueryParam(SearchParameters.MODEL_ID);
      if (nameInputField) {
        // Access this element by ID since there is no focus mechanism for this input component
        // https://github.com/huntabyte/shadcn-svelte/discussions/224
        const el = document.getElementById('plan-name');
        if (el) {
          el.focus();
        }
      }
    }
  });

  onDestroy(() => {
    resetPlanStores();
  });

  function fitPanelToWindow() {
    const width = Math.min(
      parseFloat(panelColumns),
      Math.max(MIN_PANEL_WIDTH, window.innerWidth - MIN_TABLE_WIDTH - 3),
    );
    panelColumns = `${width}px 3px 1fr`;
  }

  async function createPlan() {
    const startTimeDate = $plugins.time.primary.parse($startTimeField.value);
    const endTimeDate = $plugins.time.primary.parse($endTimeField.value);
    if (!startTimeDate || !endTimeDate) {
      return;
    }
    let startTime = getDoyTime(startTimeDate);
    let endTime = getDoyTime(endTimeDate);
    if (planUploadFiles && planUploadFiles.length) {
      try {
        const { plan_import_request_id } = await effects.importPlan(
          $nameField.value,
          $modelIdField.value,
          startTime,
          endTime,
          $simTemplateField.value,
          planTags.map(({ id }) => id),
          planUploadFiles,
          $user,
        );

        // Keep track of ongoing requests. Mutate the array to avoid triggering unnecessary re-renders
        currentImportRequests.push({
          planName: $nameField.value,
          requestId: plan_import_request_id,
        });

        planUploadFileInput.value = '';
        planUploadFiles = undefined;
        startTimeField.reset('');
        endTimeField.reset('');
        nameField.reset('');
      } catch (error) {
        planUploadFilesError = (error as Error).message;
      }
    } else {
      const newPlan: PlanSlim | null = await effects.createPlan(
        endTime,
        $modelIdField.value,
        $nameField.value,
        startTime,
        $simTemplateField.value,
        $user,
      );
      if (newPlan) {
        // Associate new tags with plan
        const newPlanTags: PlanTagsInsertInput[] = planTags.map(({ id: tag_id }) => ({
          plan_id: newPlan.id,
          tag_id,
        }));
        newPlan.tags = planTags.map(tag => ({ tag }));
        if (!$plans.find(({ id }) => newPlan.id === id)) {
          plans.updateValue(storePlans => [...storePlans, newPlan]);
        }
        await effects.createPlanTags(newPlanTags, newPlan, $user);
        startTimeField.reset('');
        endTimeField.reset('');
        nameField.reset('');
      }
    }
  }

  async function deletePlan(plan: PlanSlim): Promise<void> {
    const success = await effects.deletePlan(plan, $user);

    if (success) {
      plans.updateValue(storePlans => storePlans.filter(p => plan.id !== p.id));
    }
  }

  function deselectPlan() {
    selectPlan(null);
  }

  async function onExportPlan(plan: PlanSlim): Promise<void> {
    if (
      !planExporting &&
      (!$planImportRequestsMap[plan.id] || $planImportRequestsMap[plan.id].status === PlanImportStatus.COMPLETE)
    ) {
      planExporting = true;
      await exportPlan(plan, $user);
      planExporting = false;
    }
  }

  async function onExportSelectedPlan() {
    if (selectedPlan) {
      await onExportPlan(selectedPlan);
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
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], $user)) || [];
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

  function changeSelectedPlanTimeRange() {
    if (selectedPlan && !isSelectedPlanReadOnly) {
      showChangePlanBoundsModal(selectedPlan, $user);
    }
  }

  function hideImportPlan() {
    isPlanImportMode = false;
    isPlanUploadReadOnly = false;
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
    const startTimeMs = $plugins.time.primary.parse($startTimeField.value)?.getTime();
    const endTimeMs = $plugins.time.primary.parse($endTimeField.value)?.getTime();
    durationString = computeDurationString(startTimeMs, endTimeMs, $startTimeField.valid && $endTimeField.valid);
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
      assertPlanTransferFields(planJSON);

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
              (await effects.createTags([{ color: tagColor ?? generateRandomPastelColor(), name: tagName }], $user)) ||
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

        // if the plan has a model, it means it's a read only plan
        if (planJSON.model) {
          isPlanUploadReadOnly = true;
        } else {
          isPlanUploadReadOnly = false;
        }
      }

      updateDurationString();
    } catch (e) {
      planUploadFilesError = (e as Error).message;
    }
  }

  async function onPlanFileChange(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files !== null && files.length) {
      const file = files[0];
      if (/\.json$/.test(file.name)) {
        isLoadingPlanFile = true;
        await parsePlanFileStream(file.stream());
        isLoadingPlanFile = false;
      } else {
        planUploadFilesError = 'Plan file is not a .json file';
      }
    }
  }

  function selectPlan(planId: number | null) {
    selectedPlanId = planId;
  }

  function getDisplayNameForModel(model?: ModelSlim) {
    if (!model) {
      return '';
    }
    return `${model.name} (Version: ${model.version})`;
  }

  async function openChangePlanMissionModelModal() {
    if (selectedPlan !== undefined) {
      await effects.updatePlanMissionModel(selectedPlan, $user);
    }
  }
</script>

<PageTitle title="Plans" />

<svelte:window on:resize={fitPanelToWindow} />

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav>
    <span slot="title">Plans</span>
  </Nav>

  <CssGrid
    class="plans-split h-full min-w-0"
    bind:columns={panelColumns}
    columnMinSizes={{ 0: MIN_PANEL_WIDTH, 2: MIN_TABLE_WIDTH }}
  >
    <Panel padBody={false}>
      <svelte:fragment slot="header">
        {#if selectedPlan}
          <SectionTitle>Selected plan</SectionTitle>
          <div class="flex gap-1">
            <div
              use:tooltip={{
                content: selectedPlanImportRequest
                  ? 'Import is incomplete; export is unavailable'
                  : 'Export Selected Plan',
                placement: 'top',
              }}
            >
              <Button
                variant="outline"
                disabled={planExporting || !!selectedPlanImportRequest}
                class="flex gap-1"
                on:click={onExportSelectedPlan}
              >
                <FileUp size={16} /> Export{#if planExporting}ing...{/if}
              </Button>
            </div>

            <div use:tooltip={{ content: 'Deselect plan', placement: 'top' }}>
              <Button size="icon" variant="ghost" disabled={planExporting} on:click={deselectPlan}>
                <X size={12} />
              </Button>
            </div>
          </div>
        {:else}
          <SectionTitle>New Plan</SectionTitle>
          <div
            use:permissionHandler={{
              hasPermission: canCreate,
              permissionError,
            }}
          >
            <Button
              disabled={!canCreate}
              type="button"
              on:click={isPlanImportMode ? hideImportPlan : showImportPlan}
              class="gap-1"
              variant="outline"
            >
              <Import size={16} /> Import
            </Button>
          </div>
        {/if}
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if selectedPlan}
          {#if selectedPlanImportRequest?.status === PlanImportStatus.FAILED}
            <Alert.Root variant="destructive" class="mx-4 mt-2 w-auto min-w-0">
              <TriangleAlert class="h-4 w-4 stroke-destructive" />
              <Alert.Title>Plan import failed</Alert.Title>
              <details class="mt-1 min-w-0 text-xs">
                <summary class="cursor-pointer">Details</summary>
                <div class="mt-1 min-w-0 whitespace-normal break-words">
                  {selectedPlanImportRequest.reason?.message || 'Unknown error'}
                </div>
              </details>
            </Alert.Root>
          {:else if isSelectedPlanImporting}
            <div use:tooltip={{ content: 'Data is incomplete and editing is unavailable during import.' }}>
              <Alert.Root class="mx-4 mt-2 w-auto min-w-0">
                <LoaderCircle class="h-4 w-4 animate-spin stroke-muted-foreground" />
                <Alert.Description class="!translate-y-0 font-medium text-muted-foreground">
                  {selectedPlanImportRequest?.status === PlanImportStatus.IMPORTING_PLAN
                    ? 'Importing activities…'
                    : selectedPlanImportRequest?.status === PlanImportStatus.IMPORTING_DATASET
                      ? 'Importing results…'
                      : 'Importing…'}
                </Alert.Description>
              </Alert.Root>
            </div>
          {/if}
          {#if !selectedPlanImportRequest && selectedPlan.is_read_only}
            <Alert.Root class="mx-4 mt-2 w-auto min-w-0">
              <LockKeyhole class="opacity-75" size={16} />
              <Alert.Description class="!translate-y-0 font-medium text-muted-foreground">
                Plan is read-only.
              </Alert.Description>
            </Alert.Root>
          {/if}
          <div class="plan-metadata min-w-0">
            <fieldset>
              <div class="flex flex-col gap-0.5">
                <Label size="sm" for="selected-plan-name">Name</Label>
                <InputStellar
                  id="selected-plan-name"
                  sizeVariant="xs"
                  readonly
                  class="selected-plan-field w-full"
                  value={selectedPlan.name}
                />
              </div>
              <div class="flex flex-col gap-0.5 pt-2">
                <Label size="sm" for="selected-plan-model">Model</Label>
                {#if selectedPlan.is_read_only}
                  <div>
                    <InputStellar
                      id="selected-plan-model"
                      sizeVariant="xs"
                      readonly
                      class="selected-plan-field w-full"
                      value="Model-free plan"
                    />
                  </div>
                {:else}
                  <div class="flex min-w-0 gap-1">
                    <div class="min-w-0 flex-1" use:tooltip={{ content: selectedPlanModelName, placement: 'top' }}>
                      <InputStellar
                        id="selected-plan-model"
                        sizeVariant="xs"
                        readonly
                        class={cn(
                          'selected-plan-field w-full',
                          canChangePlanModel && !selectedPlanImportRequest ? 'selected-plan-field-editable' : '',
                          !selectedPlanModelName ? 'border-destructive' : '',
                        )}
                        value={selectedPlanModelName ?? 'Model not found'}
                      />
                    </div>
                    <div
                      use:tooltip={{
                        content: canChangePlanModel && !selectedPlanImportRequest ? 'Change Mission Model' : '',
                        placement: 'top',
                      }}
                      use:permissionHandler={{
                        hasPermission: canChangePlanModel && !selectedPlanImportRequest,
                        permissionError: selectedPlanImportRequest
                          ? PlanStatusMessages.READ_ONLY
                          : 'You do not have permission to change mission model',
                      }}
                    >
                      <Button
                        class="shrink-0"
                        variant="outline"
                        size="icon"
                        disabled={!!selectedPlanImportRequest}
                        on:click={openChangePlanMissionModelModal}
                        aria-label="Change mission model"
                      >
                        <Pencil size={16} />
                      </Button>
                    </div>
                  </div>
                {/if}
              </div>
              <div class="flex flex-col gap-0.5 pt-2">
                <Label size="sm" for="selected-plan-start">Start Time - {$plugins.time.primary.formatString}</Label>
                <div class="flex min-w-0 gap-1">
                  <input
                    id="selected-plan-start"
                    class={cn(
                      'st-input selected-plan-field min-w-0 flex-1',
                      canUpdatePlan && !isSelectedPlanReadOnly ? 'selected-plan-field-editable' : '',
                    )}
                    readonly
                    value={formatDate(new Date(selectedPlan.start_time), $plugins.time.primary.format)}
                  />
                  {#if !selectedPlan.is_read_only}
                    <div
                      use:permissionHandler={{
                        hasPermission: canUpdatePlan && !isSelectedPlanReadOnly,
                        permissionError: isSelectedPlanReadOnly
                          ? PlanStatusMessages.READ_ONLY
                          : 'You do not have permission to edit this plan.',
                      }}
                      use:tooltip={{
                        content: canUpdatePlan && !isSelectedPlanReadOnly ? 'Change plan time range' : '',
                        placement: 'top',
                      }}
                    >
                      <Button
                        aria-label="Change plan time range"
                        size="icon"
                        variant="outline"
                        disabled={isSelectedPlanReadOnly}
                        on:click={changeSelectedPlanTimeRange}><Pencil size={16} /></Button
                      >
                    </div>
                  {/if}
                </div>
              </div>
              <div class="flex flex-col gap-0.5 pt-2">
                <Label size="sm" for="selected-plan-end">End Time - {$plugins.time.primary.formatString}</Label>
                <input
                  id="selected-plan-end"
                  class={cn(
                    'st-input selected-plan-field w-full',
                    canUpdatePlan && !isSelectedPlanReadOnly ? 'selected-plan-field-editable' : '',
                  )}
                  readonly
                  value={formatDate(
                    new Date(convertDoyToYmd(selectedPlan.end_time_doy) ?? selectedPlan.end_time_doy),
                    $plugins.time.primary.format,
                  )}
                />
              </div>
              <div class="flex flex-col gap-0.5 pt-2">
                <Label size="sm" for="selected-plan-duration">Duration</Label>
                <input
                  id="selected-plan-duration"
                  class="st-input selected-plan-field w-full"
                  readonly
                  value={convertUsToDurationString(getIntervalInMs(selectedPlan.duration) * 1000) || 'None'}
                />
              </div>
              <div class="flex flex-col gap-0.5 pt-2">
                <Label size="sm" for="tags">Tags</Label>
                <TagsInput
                  className="selected-plan-tags w-full"
                  disabled
                  options={$tags}
                  selected={selectedPlan.tags.map(({ tag }) => tag)}
                  on:change={onTagsInputChange}
                />
              </div>
            </fieldset>
          </div>
          <fieldset class="my-4 pt-2">
            <Button on:click={showSelectedPlan}>Open Plan</Button>
          </fieldset>
        {:else}
          {@const canModify = canCreate && !isPlanUploadReadOnly}
          {@const canModifyTooltip = isPlanUploadReadOnly
            ? 'You cannot change time bounds for a plan that is read only.'
            : permissionError}
          <form on:submit|preventDefault={createPlan}>
            <AlertError class="m-2" error={$createPlanError} />

            <fieldset class="relative m-1 rounded bg-accent px-3 py-2" hidden={!isPlanImportMode}>
              <Button
                size="icon-xs"
                variant="ghost"
                class="absolute right-1 top-1"
                type="button"
                aria-label="Hide import plan"
                on:click={hideImportPlan}
              >
                <X size={12} />
              </Button>
              <Label class="pb-0.5" size="sm" for="plan-file">Plan File (JSON)</Label>
              <!-- TODO consider porting the input files fix to stellar https://github.com/huntabyte/shadcn-svelte/pull/1700/files -->
              <input
                class="leading-1 flex h-6 w-full cursor-pointer rounded-md border border-input bg-background px-2 pl-0 text-xs leading-5
                          ring-offset-background file:cursor-pointer file:border-0 file:bg-transparent file:font-medium
                          placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                name="Plan File"
                id="plan-file"
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
              {#if isLoadingPlanFile}
                <div class="pt-1 text-xs">Loading plan file...</div>
              {/if}
              {#if planUploadFilesError}
                <Collapse
                  ariaTitle="Plan import error"
                  defaultExpanded={false}
                  className="text-destructive [&_*]:!text-destructive break-words"
                >
                  <div slot="title">Plan import failed</div>
                  {planUploadFilesError}
                </Collapse>
              {/if}
            </fieldset>

            {#if isPlanUploadReadOnly}
              <div class="px-[16px] pt-[8px]">
                <Label size="sm" class="pb-0.5">Model</Label>
                <div class="text-xs text-muted-foreground">Model provided by read-only plan</div>
              </div>
            {:else}
              <Field field={modelIdField}>
                <Label size="sm" for="model" class="pb-0.5">Model</Label>
                <div
                  use:permissionHandler={{
                    hasPermission: canCreate,
                    permissionError,
                  }}
                >
                  <Select.Root
                    selected={{ label: getDisplayNameForModel(selectedModel), value: selectedModel?.id ?? '' }}
                    disabled={!canCreate}
                  >
                    <Select.Trigger
                      value={selectedModel?.id}
                      size="xs"
                      aria-label="Select Model"
                      aria-labelledby={null}
                      id="model"
                    >
                      <Select.Value placeholder="Select a model" />
                    </Select.Trigger>
                    <Select.Content
                      class="min-w-[240px] overflow-auto p-0"
                      sameWidth={false}
                      align="start"
                      datatype="number"
                      fitViewport
                    >
                      {#if orderedModels.length === 0}
                        <div class="select-none px-1 py-1 text-xs text-muted-foreground">No models available</div>
                      {:else}
                        {#each orderedModels as model (model.id)}
                          <Select.Item
                            size="xs"
                            value={model.id}
                            label={getDisplayNameForModel(model)}
                            class="flex gap-1"
                          >
                            {model.name}
                            <div class="whitespace-nowrap text-muted-foreground">(Version: {model.version})</div>
                          </Select.Item>
                        {/each}
                      {/if}
                    </Select.Content>
                    <Select.Input type="number" name="model" aria-label="Select Model hidden input" />
                  </Select.Root>
                </div>
              </Field>
            {/if}

            {#if selectedModel}
              <div class="px-4 pt-1">
                <ModelStatusRollup mode="rollup" model={selectedModel} showCompleteStatus />
              </div>
            {/if}

            <Field field={nameField}>
              <Label size="sm" class="pb-0.5 text-xs font-normal" for="plan-name" slot="label">Name</Label>
              <div
                use:permissionHandler={{
                  hasPermission: canCreate,
                  permissionError,
                }}
              >
                <InputStellar
                  disabled={!canCreate}
                  id="plan-name"
                  bind:this={nameInputField}
                  autocomplete="off"
                  sizeVariant="xs"
                  name="name"
                  aria-label="name"
                />
              </div>
            </Field>

            <fieldset>
              <DatePickerField
                disabled={!canModify}
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
                      hasPermission: canModify,
                      permissionError: canModifyTooltip,
                    },
                  ],
                ]}
              />
            </fieldset>
            <fieldset>
              <DatePickerField
                disabled={!canModify}
                useFallback={!$plugins.time.enableDatePicker}
                field={endTimeField}
                label={`End Time - ${$plugins.time.primary.formatString}`}
                name="end-time"
                on:change={updateDurationString}
                use={[
                  [
                    permissionHandler,
                    {
                      hasPermission: canModify,
                      permissionError: canModifyTooltip,
                    },
                  ],
                ]}
              />
            </fieldset>

            <fieldset>
              <Label class="pb-0.5" size="sm" for="plan-duration">Plan Duration</Label>
              <InputStellar sizeVariant="xs" disabled id="plan-duration" name="duration" value={durationString} />
            </fieldset>

            <Field field={simTemplateField}>
              <Label class="pb-0.5" size="sm" for="simulation-templates" slot="label">Simulation Templates</Label>
              <div
                use:permissionHandler={{
                  hasPermission: canCreate,
                  permissionError,
                }}
              >
                <Select.Root
                  disabled={!$simulationTemplates.length || !canCreate}
                  name="simulation-templates"
                  selected={{
                    value: $simTemplateField.value,
                    label: !$simulationTemplates.length
                      ? 'Empty'
                      : $simulationTemplates.find(t => t.id === $simTemplateField.value)?.description,
                  }}
                >
                  <Select.Trigger size="xs" aria-labelledby={null}>
                    <Select.Value aria-label="Select Simulation Template" />
                  </Select.Trigger>
                  <Select.Content
                    class="min-w-[240px] overflow-auto p-0"
                    sameWidth={false}
                    align="start"
                    datatype="number"
                    fitViewport
                  >
                    {#if !$simulationTemplates.length}
                      <Select.Item size="xs" value={null} label="Empty">Empty</Select.Item>
                    {:else}
                      <Select.Item size="xs" value={null} label="&nbsp;" />
                      {#each $simulationTemplates as template (template.id)}
                        <Select.Item size="xs" value={template.id} label={template.description}>
                          {template.description}
                        </Select.Item>
                      {/each}
                    {/if}
                  </Select.Content>
                  <Select.Input
                    type="number"
                    name="simulation-templates"
                    aria-label="Simulation templates hidden input"
                  />
                </Select.Root>
              </div>
            </Field>

            <fieldset>
              <Label size="sm" for="plan-tags" class="pb-0.5">Tags</Label>
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
                name="plan-tags"
                disabled={!canCreate}
                options={$tags}
                selected={planTags}
                on:change={onTagsInputChange}
              />
            </fieldset>

            <fieldset class="my-4">
              <div
                use:permissionHandler={{
                  hasPermission: canCreate,
                  permissionError,
                }}
              >
                <Button disabled={!createButtonEnabled} type="submit" class="w-full" variant="default">
                  {createPlanButtonText}
                </Button>
              </div>
            </fieldset>
          </form>
        {/if}
      </svelte:fragment>
    </Panel>

    <CssGridGutter track={1} type="column" />
    <Panel>
      <svelte:fragment slot="header">
        <div class="flex items-center gap-2">
          <SectionTitle>Plans</SectionTitle>
          <InputStellar
            bind:value={filterText}
            placeholder="Filter plans"
            autocomplete="off"
            class="w-[300px]"
            sizeVariant="xs"
            aria-label="Filter plans"
          />
        </div>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <SingleActionDataGrid
          bind:this={plansTable}
          showLoadingSkeleton
          loading={$plansLoading}
          {columnDefs}
          columnShiftResize
          autoSizeColumnsToFit={false}
          hasDeletePermission={featurePermissions.plan.canDelete}
          itemDisplayText="Plan"
          noRowsOverlayText="No Plans Found"
          items={filteredPlans}
          user={$user}
          selectedItemId={selectedPlanId ?? null}
          on:deleteItem={event => deletePlanContext(event, filteredPlans)}
          on:rowClicked={({ detail }) => selectPlan(detail.data.id)}
          on:rowDoubleClicked={({ detail }) => openPlan(detail.data.id)}
        />
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>

<style>
  .plan-metadata :global(input.selected-plan-field) {
    background-color: var(--st-white);
    border: var(--st-input-border);
    color: var(--st-input-color);
    opacity: 1;
  }

  .plan-metadata :global(input.selected-plan-field-editable) {
    background-color: var(--st-input-background-color);
  }

  .plan-metadata :global(input.selected-plan-field.border-destructive) {
    border-color: hsl(var(--destructive));
  }

  .plan-metadata :global(.selected-plan-tags) {
    background-color: var(--st-white);
    border: var(--st-input-border);
    opacity: 1;
  }

  .plan-metadata :global(.permission-disabled button) {
    opacity: 0.5 !important;
  }

  :global(.plans-split > .css-grid-gutter.column) {
    position: relative;
    z-index: 1;
  }

  :global(.plans-split > .css-grid-gutter.column::before) {
    content: '';
    inset: 0 -4px;
    position: absolute;
  }
</style>
