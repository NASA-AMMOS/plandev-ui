<svelte:options immutable={true} />

<script lang="ts">
  import { Button, Input as InputStellar, Label } from '@nasa-jpl/stellar-svelte';
  import { hasSearched, searchResults } from '../../stores/search';
  import type { User } from '../../types/app';
  import effects from '../../utilities/effects';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let user: User | null;

  let filterActType: string = '';
  let filterActName: string = '';
  let filterArgName: string = '';
  let filterArgValue: string = '';
  let filterTagValue: string = '';

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
    const results = await effects.searchActivities(filterActType, filterActName, filterArgs, filterTagValue, user);
    if (results) {
      searchResults.set(results);
    }
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <SectionTitle>Search for activities across plans</SectionTitle>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <form on:submit|preventDefault={onSearch} class="flex flex-col">
      <fieldset>
        <Label for="activity-type-input">Activity Type</Label>
        <InputStellar
          bind:value={filterActType}
          id="activity-type-input"
          placeholder="Activity Type"
          autocomplete="off"
          class="w-[300px]"
          sizeVariant="xs"
          aria-label="Activity Type"
        />
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
        <InputStellar
          bind:value={filterTagValue}
          id="tag-value-input"
          placeholder="Tag Value"
          autocomplete="off"
          class="w-[300px]"
          sizeVariant="xs"
          aria-label="Tag Value"
        />
      </fieldset>
      <fieldset class="my-4">
        <Button
          type="submit"
          class="w-full"
          disabled={filterActType === '' &&
            filterActName === '' &&
            filterArgName === '' &&
            filterArgValue === '' &&
            filterTagValue === ''}>Search</Button
        >
      </fieldset>
    </form>
  </svelte:fragment>
</Panel>
