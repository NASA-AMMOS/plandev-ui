<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Button, Input as InputStellar, Label } from '@nasa-jpl/stellar-svelte';
  import { ChevronDown, CircleQuestionMark } from 'lucide-svelte';
  import { models } from '../../stores/model';
  import {
    hasSearched,
    isSearching,
    PAGE_SIZE,
    searchCurrentPage,
    searchOrderBy,
    searchResults,
    searchRunId,
    searchTotalCount,
  } from '../../stores/search';
  import { gqlSubscribable } from '../../stores/subscribable';
  import { tagsStore } from '../../stores/tags';
  import { users } from '../../stores/user';
  import type { ActivityPreset } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { DropdownOptions } from '../../types/dropdown';
  import type { ModelSlim } from '../../types/model';
  import type { GqlSubscribable } from '../../types/subscribable';
  import effects from '../../utilities/effects';
  import gql from '../../utilities/gql';
  import Panel from '../ui/Panel.svelte';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import Tooltip from '../ui/Tooltip.svelte';

  export let user: User | null;

  // Consolidated filter state
  const DEFAULT_FILTERS = {
    actName: '',
    actType: '',
    argName: '',
    argValue: '',
    createdBy: '',
    lastModifiedAfter: '',
    lastModifiedBefore: '',
    planName: '',
    planOwner: '',
    preset: '',
    schedulerCreatedOnly: false,
    startOffsetMax: '',
    startOffsetMin: '',
    tagValue: '',
  };

  type FilterKey = keyof typeof DEFAULT_FILTERS;

  // Map filter keys to URL param names where they differ
  const URL_PARAM_OVERRIDES: Partial<Record<keyof typeof DEFAULT_FILTERS, string>> = {
    schedulerCreatedOnly: 'schedulerOnly',
    tagValue: 'tag',
  };

  const activityPresets: GqlSubscribable<ActivityPreset[]> = gqlSubscribable<ActivityPreset[]>(
    gql.SUB_ACTIVITY_PRESETS_ALL,
    {},
    [],
  );
  const modelsLoading = models.loading;
  const modelsError = models.error;
  const tagsLoading = tagsStore.loading;
  const tagsError = tagsStore.error;
  const usersLoading = users.loading;
  const usersError = users.error;
  const presetsLoading = activityPresets.loading;
  const presetsError = activityPresets.error;

  let argNameOptions: DropdownOptions = [];
  let selectedModelId: number | undefined;
  let filters = { ...DEFAULT_FILTERS };
  let initialized = false;
  let orderedModels: ModelSlim[] = [];
  let modelOptions: DropdownOptions = [];
  let tagOptions: DropdownOptions = [];
  let typeOptions: DropdownOptions = [];
  let presetOptions: DropdownOptions = [];
  let userOptions: DropdownOptions = [];

  $: selectedModel = selectedModelId !== undefined ? $models.find(m => m.id === selectedModelId) : undefined;

  $: orderedModels = [...$models].sort(({ id: idA }, { id: idB }) => idB - idA);

  $: modelOptions = [
    { display: '', value: '' },
    ...orderedModels.map(m => ({ display: getDisplayNameForModel(m), value: m.id })),
  ];

  $: tagOptions = [{ display: '', value: '' }, ...$tagsStore.map(tag => ({ display: tag.name, value: tag.name }))];

  $: userOptions = [
    { display: '', value: '' },
    ...$users.filter((u): u is string => u !== null).map(u => ({ display: u, value: u })),
  ];

  $: {
    const activityTypeNames: string[] = [''];
    if (selectedModel) {
      activityTypeNames.push(...selectedModel.activity_types.map(type => type.name));
    } else {
      activityTypeNames.push(
        ...new Set(($models ?? []).flatMap(model => model?.activity_types?.map(type => type.name) ?? [])),
      );
    }
    typeOptions = activityTypeNames
      .map(type => ({ display: type, value: type }))
      .sort((a, b) => a.display.localeCompare(b.display));
  }

  $: {
    const presetNames = [
      ...new Set<string>(
        $activityPresets
          .filter(preset => selectedModel === undefined || preset.model_id === selectedModel.id)
          .map(preset => preset.name),
      ),
    ];
    presetOptions = [{ display: '', value: '' }, ...presetNames.map(name => ({ display: name, value: name }))];
  }

  $: {
    const sourceModels = selectedModel ? [selectedModel] : ($models ?? []);
    const paramNames = new Set<string>();
    for (const model of sourceModels) {
      for (const type of model?.activity_types ?? []) {
        if (filters.actType && type.name !== filters.actType) {
          continue;
        }
        for (const paramName of Object.keys(type.parameters ?? {})) {
          paramNames.add(paramName);
        }
      }
    }
    argNameOptions = [
      { display: '', value: '' },
      ...[...paramNames].sort((a, b) => a.localeCompare(b)).map(name => ({ display: name, value: name })),
    ];
  }

  // Initialize from URL on first page load (browser only — SSR can't navigate)
  $: if (browser && $page.url) {
    initFromUrl();
  }

  $: subscriptionError = $modelsError || $tagsError || $usersError || $presetsError || '';

  // Keep URL in sync with current filter form state after init
  $: if (browser && initialized) {
    void filters;
    void selectedModelId;
    updateUrl();
  }

  function getParamName(key: FilterKey): string {
    return URL_PARAM_OVERRIDES[key] ?? key;
  }

  function initFromUrl() {
    if (initialized) {
      return;
    }
    initialized = true;

    const params = $page.url.searchParams;

    const modelIdParam = params.get('modelId');
    if (modelIdParam) {
      selectedModelId = parseInt(modelIdParam);
    }

    const updates: Partial<typeof DEFAULT_FILTERS> = {};
    for (const key of Object.keys(DEFAULT_FILTERS) as FilterKey[]) {
      const val = params.get(getParamName(key));
      if (val !== null) {
        updates[key] = (typeof DEFAULT_FILTERS[key] === 'boolean' ? val === 'true' : val) as never;
      }
    }
    if (Object.keys(updates).length) {
      filters = { ...filters, ...updates };
    }

    if (selectedModelId !== undefined || Object.keys(updates).length > 0) {
      onSearch();
    }
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (selectedModelId !== undefined) {
      params.set('modelId', selectedModelId.toString());
    }
    for (const key of Object.keys(filters) as FilterKey[]) {
      const val = filters[key];
      if (val !== '' && val !== false) {
        params.set(getParamName(key), val.toString());
      }
    }
    const qs = params.toString();
    goto(qs ? `${$page.url.pathname}?${qs}` : $page.url.pathname, {
      keepFocus: true,
      noScroll: true,
      replaceState: true,
    });
  }

  export async function onSearch(pageNumber: number = 0) {
    hasSearched.set(true);
    searchCurrentPage.set(pageNumber);
    isSearching.set(true);

    const filterArgs: [name: string, value: string | number | boolean][] = [];
    if (filters.argName || filters.argValue) {
      const v = filters.argValue;
      if (v.toLowerCase() === 'true') {
        filterArgs.push([filters.argName, true]);
      } else if (v.toLowerCase() === 'false') {
        filterArgs.push([filters.argName, false]);
      } else if (v !== '' && !isNaN(Number(v))) {
        filterArgs.push([filters.argName, Number(v)]);
      } else {
        filterArgs.push([filters.argName, v]);
      }
    }

    try {
      const result = await effects.searchActivities(
        {
          actName: filters.actName,
          actType: filters.actType,
          args: filterArgs,
          createdBy: filters.createdBy,
          lastModifiedAfter: filters.lastModifiedAfter,
          lastModifiedBefore: filters.lastModifiedBefore,
          modelId: selectedModelId,
          planName: filters.planName,
          planOwner: filters.planOwner,
          preset: filters.preset,
          schedulerCreatedOnly: filters.schedulerCreatedOnly,
          startOffsetMax: filters.startOffsetMax,
          startOffsetMin: filters.startOffsetMin,
          tagValue: filters.tagValue,
        },
        {
          limit: PAGE_SIZE,
          offset: pageNumber * PAGE_SIZE,
          orderBy: $searchOrderBy,
        },
        user,
      );

      if (result) {
        searchResults.set(result.results);
        searchTotalCount.set(result.totalCount);
      }

      updateUrl();
    } finally {
      isSearching.set(false);
      searchRunId.update(n => n + 1);
    }
  }

  function clearFilters() {
    selectedModelId = undefined;
    filters = { ...DEFAULT_FILTERS };
    hasSearched.set(false);
    searchResults.set([]);
    searchTotalCount.set(0);
    searchCurrentPage.set(0);
    goto($page.url.pathname, { keepFocus: true, noScroll: true, replaceState: true });
  }

  function getDisplayNameForModel(model?: ModelSlim) {
    if (!model) {
      return '';
    }
    return `${model.name} (Version: ${model.version})`;
  }
</script>

<Panel overflowYBody="hidden" padBody={false}>
  <svelte:fragment slot="header">
    <SectionTitle>Search for Activities Across Plans</SectionTitle>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <form on:submit|preventDefault={() => onSearch()} class="flex h-full flex-col" data-search-form-ready={initialized}>
      {#if subscriptionError}
        <div class="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          Failed to load filter data: {subscriptionError}
        </div>
      {/if}
      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-2">
        <div class="flex flex-col gap-1">
          <Label size="sm">Mission Model</Label>
          <SearchableDropdown
            options={modelOptions}
            loading={$modelsLoading}
            on:change={e => {
              const v = e.detail[0];
              selectedModelId = v === '' || v === undefined ? undefined : Number(v);
            }}
            selectedOptionValues={[selectedModelId ?? '']}
          >
            <ChevronDown slot="icon" />
          </SearchableDropdown>
        </div>

        <div class="flex flex-col gap-1">
          <Label size="sm">Activity Type</Label>
          <SearchableDropdown
            options={typeOptions}
            loading={$modelsLoading}
            on:change={e => (filters = { ...filters, actType: e.detail[0]?.toString() ?? '' })}
            selectedOptionValues={[filters.actType]}
          >
            <ChevronDown slot="icon" />
          </SearchableDropdown>
        </div>

        <div class="flex flex-col gap-1">
          <Label size="sm" for="activity-name-input">Activity Name</Label>
          <InputStellar
            bind:value={filters.actName}
            id="activity-name-input"
            autocomplete="off"
            class="w-full"
            sizeVariant="xs"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label size="sm">Argument Name</Label>
          <SearchableDropdown
            options={argNameOptions}
            loading={$modelsLoading}
            on:change={e => (filters = { ...filters, argName: e.detail[0]?.toString() ?? '' })}
            selectedOptionValues={[filters.argName]}
          >
            <ChevronDown slot="icon" />
          </SearchableDropdown>
        </div>
        <div class="flex flex-col gap-1">
          <Label size="sm" for="argument-value-input" class="flex items-center gap-1">
            Argument Value
            <Tooltip
              content="Defaults defined by the mission model are not applied to search filters, so you may need to specify argument values explicitly even if they were not provided when the activity was created."
              class="max-h-none max-w-md whitespace-normal [&>span]:whitespace-normal"
            >
              <span class="ml-1 cursor-help text-muted-foreground"> <CircleQuestionMark size={14} /></span>
            </Tooltip>
          </Label>
          <InputStellar
            bind:value={filters.argValue}
            id="argument-value-input"
            autocomplete="off"
            class="w-full"
            sizeVariant="xs"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label size="sm">Tag</Label>
          <SearchableDropdown
            options={tagOptions}
            loading={$tagsLoading}
            on:change={e => (filters = { ...filters, tagValue: e.detail[0]?.toString() ?? '' })}
            selectedOptionValues={[filters.tagValue]}
          >
            <ChevronDown slot="icon" />
          </SearchableDropdown>
        </div>

        <div class="flex flex-col gap-1">
          <Label size="sm">Preset</Label>
          <SearchableDropdown
            options={presetOptions}
            loading={$presetsLoading}
            on:change={e => (filters = { ...filters, preset: e.detail[0]?.toString() ?? '' })}
            selectedOptionValues={[filters.preset]}
          >
            <ChevronDown slot="icon" />
          </SearchableDropdown>
        </div>

        <div class="flex flex-col gap-1">
          <Label size="sm">Created By</Label>
          <SearchableDropdown
            options={userOptions}
            loading={$usersLoading}
            on:change={e => (filters = { ...filters, createdBy: e.detail[0]?.toString() ?? '' })}
            selectedOptionValues={[filters.createdBy]}
          >
            <ChevronDown slot="icon" />
          </SearchableDropdown>
        </div>

        <div class="flex flex-col gap-1">
          <Label size="sm" for="modified-after-input">Last Modified After</Label>
          <InputStellar
            bind:value={filters.lastModifiedAfter}
            id="modified-after-input"
            class="w-full"
            sizeVariant="xs"
            type="datetime-local"
          />
        </div>
        <div class="flex flex-col gap-1">
          <Label size="sm" for="modified-before-input">Last Modified Before</Label>
          <InputStellar
            bind:value={filters.lastModifiedBefore}
            id="modified-before-input"
            class="w-full"
            sizeVariant="xs"
            type="datetime-local"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label size="sm" for="start-offset-min-input">Start Offset (min)</Label>
          <InputStellar
            bind:value={filters.startOffsetMin}
            id="start-offset-min-input"
            placeholder="e.g., 1 day, 02:30:00"
            autocomplete="off"
            class="w-full"
            sizeVariant="xs"
          />
        </div>
        <div class="flex flex-col gap-1">
          <Label size="sm" for="start-offset-max-input">Start Offset (max)</Label>
          <InputStellar
            bind:value={filters.startOffsetMax}
            id="start-offset-max-input"
            placeholder="e.g., 7 days, 24:00:00"
            autocomplete="off"
            class="w-full"
            sizeVariant="xs"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label size="sm" for="plan-name-input">Plan Name</Label>
          <InputStellar
            bind:value={filters.planName}
            id="plan-name-input"
            autocomplete="off"
            class="w-full"
            sizeVariant="xs"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label size="sm">Plan Owner</Label>
          <SearchableDropdown
            options={userOptions}
            loading={$usersLoading}
            on:change={e => (filters = { ...filters, planOwner: e.detail[0]?.toString() ?? '' })}
            selectedOptionValues={[filters.planOwner]}
          >
            <ChevronDown slot="icon" />
          </SearchableDropdown>
        </div>

        <div class="flex items-center gap-2">
          <label class="flex cursor-pointer items-center gap-2" for="scheduler-only">
            <input
              type="checkbox"
              bind:checked={filters.schedulerCreatedOnly}
              name="scheduler-only"
              id="scheduler-only"
            />
            <span class="text-xs">Scheduler-created only</span>
          </label>
        </div>
      </div>
      <div class="flex flex-col gap-2 border-t border-border p-3">
        <Button type="submit" class="w-full">Search</Button>
        <Button type="button" class="w-full" variant="outline" on:click={clearFilters}>Clear Filters</Button>
      </div>
    </form>
  </svelte:fragment>
</Panel>
