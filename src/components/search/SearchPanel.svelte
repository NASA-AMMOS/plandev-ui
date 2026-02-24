<svelte:options immutable={true} />

<script lang="ts">
  import { Button, Input as InputStellar, Label, Select } from '@nasa-jpl/stellar-svelte';
  import { models } from '../../stores/model';
  import { hasSearched, searchResults } from '../../stores/search';
  import { gqlSubscribable } from '../../stores/subscribable';
  import { tags } from '../../stores/tags';
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

  let selectedModel: ModelSlim | undefined;
  let filterActType: string = '';
  let filterActName: string = '';
  let filterArgName: string = '';
  let filterArgValue: string = '';
  let filterTagValue: string = '';
  let filterPreset: string = '';

  let orderedModels: ModelSlim[] = [];
  let tagOptions: DropdownOptions = [];
  let typeOptions: DropdownOptions = [];
  let presetOptions: DropdownOptions = [];

  $: orderedModels = [...$models].sort(({ id: idA }, { id: idB }) => idB - idA);

  $: tagOptions = [{ display: '', value: '' }, ...$tags.map(tag => ({ display: tag.name, value: tag.name }))];

  $: {
    const activityTypeNames: string[] = [''];
    if (selectedModel) {
      activityTypeNames.push(...selectedModel.activity_types.map(type => type.name));
    } else {
      // remove duplicate activity type names across all models
      activityTypeNames.push(
        ...new Set(($models ?? []).flatMap(model => model?.activity_types?.map(type => type.name) ?? [])),
      );
    }
    typeOptions = activityTypeNames
      .map(type => ({
        display: type,
        value: type,
      }))
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
    presetOptions = [{ display: '', value: '' }];
    presetOptions.push(...presetNames.map(name => ({ display: name, value: name })));
  }

  async function onSearch() {
    hasSearched.set(true);

    const filterArgs: [name: string, value: string | number | boolean][] = [];
    if (filterArgName || filterArgValue) {
      if (filterArgValue.toLowerCase() === 'true') {
        filterArgs.push([filterArgName, true]);
      } else if (filterArgValue.toLowerCase() === 'false') {
        filterArgs.push([filterArgName, false]);
      } else if (!isNaN(Number(filterArgValue))) {
        filterArgs.push([filterArgName, Number(filterArgValue)]);
      } else {
        filterArgs.push([filterArgName, filterArgValue]);
      }
    }
    const results = await effects.searchActivities(
      selectedModel?.id,
      filterActType,
      filterActName,
      filterArgs,
      filterTagValue,
      filterPreset,
      user,
    );
    if (results) {
      searchResults.set(results);
    }
  }

  function clearFilters() {
    selectedModel = undefined;
    filterActType = '';
    filterActName = '';
    filterArgName = '';
    filterArgValue = '';
    filterTagValue = '';
    filterPreset = '';
    hasSearched.set(false);
    searchResults.set([]);
  }

  function onTypeChange(event: CustomEvent) {
    filterActType = event.detail.length ? (event.detail[0]?.toString() ?? '') : '';
  }

  function onTagChange(event: CustomEvent) {
    filterTagValue = event.detail.length ? (event.detail[0]?.toString() ?? '') : '';
  }

  function getDisplayNameForModel(model?: ModelSlim) {
    if (!model) {
      return '';
    }
    return `${model.name} (Version: ${model.version})`;
  }

  function onPresetChange(event: CustomEvent) {
    filterPreset = event.detail.length ? (event.detail[0]?.toString() ?? '') : '';
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <SectionTitle>Search for activities across plans</SectionTitle>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <form on:submit|preventDefault={onSearch} class="flex flex-col">
      <fieldset>
        <Label>Mission Model</Label>
        <div>
          <Select.Root
            selected={{ label: getDisplayNameForModel(selectedModel), value: selectedModel?.id ?? '' }}
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
      </fieldset>
      <fieldset>
        <Label>Activity Type</Label>
        <SearchableDropdown options={typeOptions} on:change={onTypeChange} selectedOptionValues={[filterActType]} />
      </fieldset>
      <fieldset>
        <Label for="activity-name-input">Activity Name</Label>
        <InputStellar
          bind:value={filterActName}
          id="activity-name-input"
          placeholder="Activity Name"
          autocomplete="off"
          class="w-[300px]"
          sizeVariant="xs"
          aria-label="Activity Name"
        />
      </fieldset>
      <fieldset>
        <Label for="argument-name-input">Argument Name</Label>
        <InputStellar
          bind:value={filterArgName}
          id="argument-name-input"
          placeholder="Argument Name"
          autocomplete="off"
          class="w-[300px]"
          sizeVariant="xs"
          aria-label="Argument Name"
        />
        <Label for="argument-value-input">Argument Value</Label>
        <InputStellar
          bind:value={filterArgValue}
          id="argument-value-input"
          placeholder="Argument Value"
          autocomplete="off"
          class="w-[300px]"
          sizeVariant="xs"
          aria-label="Argument Value"
        />
      </fieldset>
      <fieldset>
        <Label for="tag-value-input">Tag Value</Label>
        <SearchableDropdown options={tagOptions} on:change={onTagChange} selectedOptionValues={[filterTagValue]} />
      </fieldset>
      <fieldset>
        <Label for="preset-name-input">Preset</Label>
        <SearchableDropdown options={presetOptions} on:change={onPresetChange} selectedOptionValues={[filterPreset]} />
      </fieldset>
      <fieldset class="my-4">
        <Button type="button" class="w-full" on:click={clearFilters}>Clear Filters</Button>
        <div />
        <Button
          type="submit"
          class="w-full"
          disabled={filterActType === '' &&
            filterActName === '' &&
            filterArgName === '' &&
            filterArgValue === '' &&
            filterTagValue === '' &&
            filterPreset === ''}>Search</Button
        >
      </fieldset>
    </form>
  </svelte:fragment>
</Panel>
