<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { Button, Input as InputStellar, Label, Select } from '@nasa-jpl/stellar-svelte';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import { flatten } from 'lodash-es';
  import { ArrowLeftRight, Clipboard, FileUp, Import, X } from 'lucide-svelte';
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
  import { parseJSONStream } from '../../utilities/generic';
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
    },
  ];
  const permissionError: string = 'You do not have permission to create a plan';

  let canCreate: boolean = false;
  let canChangePlanModel: boolean = false;
  let columnDefs: DataGridColumnDef[] = baseColumnDefs;
  let createPlanButtonText: string = 'Create';
  let durationString: string = 'None';
  let filterText: string = '';
  let isPlanImportMode: boolean = false;
  let orderedModels: ModelSlim[] = [];
  let nameInputField: InputStellar;
  let planExporting: boolean = false;
  let planTags: Tag[] = [];
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
      ($plans || []).map(plan => plan.name),
      'Plan name already exists',
    ),
  ]);
  let planUploadFiles: FileList | undefined;
  let planUploadFilesError: string | null = null;
  let planUploadFileInput: HTMLInputElement;
  let simTemplateField = field<number | null>(null);

  $: startTimeField = field<string>('', [required, $plugins.time.primary.validate]);
  $: endTimeField = field<string>('', [required, $plugins.time.primary.validate]);
  $: canChangePlanModel = selectedPlan !== undefined && featurePermissions.plan.canUpdateModel(user, selectedPlan);

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
  $: plans.updateValue(() => data.plans);
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
              isDownloadCancellable: true,
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
    $plans !== null &&
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
  $: filteredPlans = ($plans || []).filter(plan => {
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
        if (!($plans || []).find(({ id }) => newPlan.id === id)) {
          plans.updateValue(storePlans => [...(storePlans || []), newPlan]);
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
      plans.updateValue(storePlans => (storePlans || []).filter(p => plan.id !== p.id));
    }
  }

  function deselectPlan() {
    selectPlan(null);
  }

  async function onExportPlan(plan: PlanSlim): Promise<void> {
    if (!planExporting) {
      planExporting = true;
      await exportPlan(plan, user);
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

  function getDisplayNameForModel(model?: ModelSlim) {
    if (!model) {
      return '';
    }
    return `${model.name} (Version: ${model.version})`;
  }

  async function openChangePlanMissionModelModal() {
    if (selectedPlan !== undefined) {
      await effects.updatePlanMissionModel(selectedPlan, user);
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
        {#if selectedPlan}
          <SectionTitle>Selected plan</SectionTitle>
          <div class="flex gap-1">
            <div
              use:tooltip={{
                content: 'Export Selected Plan',
                placement: 'top',
              }}
            >
              <Button variant="outline" disabled={planExporting} class="flex gap-1" on:click={onExportSelectedPlan}>
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
          <div class="plan-metadata">
            <fieldset>
              <div>
                <Input layout="inline">
                  <Label size="sm" class="overflow-hidden text-ellipsis whitespace-nowrap" for="name">Model</Label>
                  <div class="flex gap-1">
                    <div use:tooltip={{ content: selectedPlanModelName, placement: 'top' }}>
                      <InputStellar
                        sizeVariant="xs"
                        disabled
                        class="w-full"
                        name="name"
                        value={selectedPlanModelName}
                      />
                    </div>
                    <div
                      use:tooltip={{ content: canChangePlanModel ? 'Change Mission Model' : '', placement: 'top' }}
                      use:permissionHandler={{
                        hasPermission: canChangePlanModel,
                        permissionError: 'You do not have permission to change mission model',
                      }}
                    >
                      <Button
                        class="shrink-0"
                        variant="outline"
                        size="icon"
                        on:click={openChangePlanMissionModelModal}
                        aria-label="Change mission model"
                      >
                        <ArrowLeftRight size={16} />
                      </Button>
                    </div>
                  </div>
                </Input>
              </div>
              <Input layout="inline">
                <Label size="sm" class="overflow-hidden text-ellipsis whitespace-nowrap" for="id">Name</Label>
                <InputStellar sizeVariant="xs" disabled class="w-full" name="id" value={selectedPlan.name} />
              </Input>
              <Input layout="inline">
                <Label size="sm" class="overflow-hidden text-ellipsis whitespace-nowrap" for="start-time">
                  Start Time - {$plugins.time.primary.label}
                </Label>
                <InputStellar
                  sizeVariant="xs"
                  disabled
                  class="w-full"
                  name="start-time"
                  value={selectedPlanStartTime}
                />
              </Input>
              <Input layout="inline">
                <Label size="sm" class="overflow-hidden text-ellipsis whitespace-nowrap" for="end-time">
                  End Time - {$plugins.time.primary.label}
                </Label>
                <InputStellar sizeVariant="xs" disabled class="w-full" name="end-time" value={selectedPlanEndTime} />
              </Input>
              <Input layout="inline">
                <Label size="sm" class="overflow-hidden text-ellipsis whitespace-nowrap" for="duration">
                  Plan Duration
                </Label>
                <InputStellar
                  sizeVariant="xs"
                  disabled
                  class="w-full"
                  name="duration"
                  value={convertUsToDurationString(getIntervalInMs(selectedPlan.duration) * 1000)}
                />
              </Input>
              <Input layout="inline">
                <Label size="sm" class="overflow-hidden text-ellipsis whitespace-nowrap" for="tags">Tags</Label>
                <TagsInput
                  disabled
                  options={$tags}
                  selected={selectedPlan.tags.map(({ tag }) => tag)}
                  on:change={onTagsInputChange}
                />
              </Input>
            </fieldset>
          </div>
          <fieldset>
            <Button on:click={showSelectedPlan}>Open plan</Button>
          </fieldset>
        {:else}
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
                <XIcon size={12} />
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
              {#if planUploadFilesError}
                <div class="overflow-hidden text-ellipsis whitespace-nowrap text-red-500">{planUploadFilesError}</div>
              {/if}
            </fieldset>

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
                    {#each orderedModels as model (model.id)}
                      <Select.Item size="xs" value={model.id} label={getDisplayNameForModel(model)} class="flex gap-1">
                        {model.name}
                        <div class="whitespace-nowrap text-muted-foreground">(Version: {model.version})</div>
                      </Select.Item>
                    {/each}
                  </Select.Content>
                  <Select.Input type="number" name="model" aria-label="Select Model hidden input" />
                </Select.Root>
              </div>
            </Field>

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
                disabled={!canCreate}
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
                disabled={!canCreate}
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

    <Panel>
      <svelte:fragment slot="header">
        <div class="flex items-center gap-2">
          <SectionTitle>
            <Clipboard size={16} slot="icon" />
            Plans
          </SectionTitle>
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
          showLoadingSkeleton
          loading={$plans === null}
          {columnDefs}
          hasDeletePermission={featurePermissions.plan.canDelete}
          itemDisplayText="Plan"
          items={filteredPlans}
          {user}
          selectedItemId={selectedPlanId ?? null}
          on:deleteItem={event => deletePlanContext(event, filteredPlans)}
          on:rowClicked={({ detail }) => selectPlan(detail.data.id)}
          on:rowDoubleClicked={({ detail }) => openPlan(detail.data.id)}
        />
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>
