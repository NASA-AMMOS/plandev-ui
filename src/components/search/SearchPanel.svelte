<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Button, Input as InputStellar, Label, Select } from '@nasa-jpl/stellar-svelte';
  import { models } from '../../stores/model';
  import {
    hasSearched,
    PAGE_SIZE,
    searchCurrentPage,
    searchOrderBy,
    searchResults,
    searchTotalCount,
  } from '../../stores/search';
  import { gqlSubscribable } from '../../stores/subscribable';
  import { tags } from '../../stores/tags';
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

  export let user: User | null;

  let activityPresets: GqlSubscribable<ActivityPreset[]> = gqlSubscribable<ActivityPreset[]>(
    gql.SUB_ACTIVITY_PRESETS_ALL,
    {},
    [],
  );

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
    tagValue: '',
  };

  // Map filter keys to URL param names where they differ
  const URL_PARAM_OVERRIDES: Partial<Record<keyof typeof DEFAULT_FILTERS, string>> = {
    schedulerCreatedOnly: 'schedulerOnly',
    tagValue: 'tag',
  };

  type FilterKey = keyof typeof DEFAULT_FILTERS;

  function getParamName(key: FilterKey): string {
    return URL_PARAM_OVERRIDES[key] ?? key;
  }

  let selectedModel: ModelSlim | undefined;
  let filters = { ...DEFAULT_FILTERS };
  let initialized = false;
  let pendingModelId: number | null = null;
  let pendingSearch = false;

  let orderedModels: ModelSlim[] = [];
  let tagOptions: DropdownOptions = [];
  let typeOptions: DropdownOptions = [];
  let presetOptions: DropdownOptions = [];
  let userOptions: DropdownOptions = [];
  let argNameOptions: DropdownOptions = [];

  $: orderedModels = [...$models].sort(({ id: idA }, { id: idB }) => idB - idA);

  $: tagOptions = [{ display: '', value: '' }, ...$tags.map(tag => ({ display: tag.name, value: tag.name }))];

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

  $: hasAnyFilter =
    selectedModel !== undefined ||
    Object.entries(filters).some(([k, v]) => (k === 'schedulerCreatedOnly' ? v === true : v !== ''));

  // Initialize from URL on first page load (browser only — SSR can't navigate)
  $: if (browser && $page.url) {
    initFromUrl();
  }

  // Resolve pending model ID once models subscription delivers data
  $: if (pendingModelId !== null && $models.length > 0) {
    selectedModel = $models.find(m => m.id === pendingModelId);
    pendingModelId = null;
    if (pendingSearch) {
      pendingSearch = false;
      onSearch();
    }
  }

  // Keep URL in sync with current filter form state after init
  $: if (browser && initialized) {
    void filters;
    void selectedModel;
    updateUrl();
  }

  function initFromUrl() {
    if (initialized) {
      return;
    }
    initialized = true;

    const params = $page.url.searchParams;

    const modelIdParam = params.get('modelId');
    if (modelIdParam) {
      const id = parseInt(modelIdParam);
      const found = $models.find(m => m.id === id);
      if (found) {
        selectedModel = found;
      } else {
        pendingModelId = id;
      }
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

    if (hasAnyFilter) {
      onSearch();
    } else if (pendingModelId !== null) {
      // Model is the only filter; defer search until it resolves
      pendingSearch = true;
    }
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (selectedModel) {
      params.set('modelId', selectedModel.id.toString());
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

    const result = await effects.searchActivities(
      {
        actName: filters.actName,
        actType: filters.actType,
        args: filterArgs,
        createdBy: filters.createdBy,
        lastModifiedAfter: filters.lastModifiedAfter,
        lastModifiedBefore: filters.lastModifiedBefore,
        modelId: selectedModel?.id,
        planName: filters.planName,
        planOwner: filters.planOwner,
        preset: filters.preset,
        schedulerCreatedOnly: filters.schedulerCreatedOnly,
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
  }

  function clearFilters() {
    selectedModel = undefined;
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

<Panel overflowYBody="auto">
  <svelte:fragment slot="header">
    <SectionTitle>Search for activities across plans</SectionTitle>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <form on:submit|preventDefault={() => onSearch()} class="flex flex-col gap-3 p-2">
      <div class="flex flex-col gap-1">
        <Label size="sm">Mission Model</Label>
        <Select.Root
          selected={{
            label: selectedModel ? getDisplayNameForModel(selectedModel) : 'All Models',
            value: selectedModel?.id,
          }}
          onSelectedChange={v => (selectedModel = $models.find(model => model.id === v?.value))}
          loop={false}
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
            <Select.Item size="xs" value={undefined} label="All Models" class="flex gap-1">All Models</Select.Item>
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

      <div class="flex flex-col gap-1">
        <Label size="sm">Activity Type</Label>
        <SearchableDropdown
          options={typeOptions}
          on:change={e => (filters = { ...filters, actType: e.detail[0]?.toString() ?? '' })}
          selectedOptionValues={[filters.actType]}
        />
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
          on:change={e => (filters = { ...filters, argName: e.detail[0]?.toString() ?? '' })}
          selectedOptionValues={[filters.argName]}
        />
      </div>
      <div class="flex flex-col gap-1">
        <Label size="sm" for="argument-value-input">Argument Value</Label>
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
          on:change={e => (filters = { ...filters, tagValue: e.detail[0]?.toString() ?? '' })}
          selectedOptionValues={[filters.tagValue]}
        />
      </div>

      <div class="flex flex-col gap-1">
        <Label size="sm">Preset</Label>
        <SearchableDropdown
          options={presetOptions}
          on:change={e => (filters = { ...filters, preset: e.detail[0]?.toString() ?? '' })}
          selectedOptionValues={[filters.preset]}
        />
      </div>

      <div class="flex flex-col gap-1">
        <Label size="sm">Created By</Label>
        <SearchableDropdown
          options={userOptions}
          on:change={e => (filters = { ...filters, createdBy: e.detail[0]?.toString() ?? '' })}
          selectedOptionValues={[filters.createdBy]}
        />
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
          on:change={e => (filters = { ...filters, planOwner: e.detail[0]?.toString() ?? '' })}
          selectedOptionValues={[filters.planOwner]}
        />
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

      <div class="mt-4 flex flex-col gap-2">
        <Button type="button" class="w-full" variant="outline" on:click={clearFilters}>Clear Filters</Button>
        <Button type="submit" class="w-full" disabled={!hasAnyFilter}>Search</Button>
      </div>
    </form>
  </svelte:fragment>
</Panel>
