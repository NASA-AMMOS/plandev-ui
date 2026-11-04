<svelte:options immutable={true} />

<script lang="ts">
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { getUserStore } from '../../stores/user';
  import type { FileRef } from '../../types/actions';
  import type { DropdownOption, SelectedDropdownOptionValue } from '../../types/dropdown';
  import type { WorkspaceFileRevision } from '../../types/workspace';
  import { LATEST_REVISION, getFileRefRevisionLabel } from '../../utilities/actions';
  import { getFileRevisionHistory } from '../../utilities/fileRevisionHistory';
  import { getShortISOForDate } from '../../utilities/time';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';

  export let allowWorkingCopy: boolean = true;
  export let fileRef: FileRef;

  // Not a possible revision name (those are letters or numbers), and truthy as the dropdown requires
  const WORKING_COPY = 'working-copy';
  const dispatch = createEventDispatcher<{ change: FileRef }>();
  const history = getFileRevisionHistory();
  const user = getUserStore();

  // The selected file's revisions are fetched as soon as it is selected, so its selection can be checked.
  $: history.load(fileRef.path, $user);
  $: entry = $history[fileRef.path];
  $: revisions = Array.isArray(entry) ? entry : undefined;
  $: error = entry === 'error';
  $: loading = entry === 'loading' || entry === undefined;
  $: options = getOptions(revisions ?? [], fileRef, allowWorkingCopy);
  $: selectedValues = fileRef.revision === undefined ? (allowWorkingCopy ? [WORKING_COPY] : []) : [fileRef.revision];
  $: description = revisions?.find(({ name }) => `${name}` === fileRef.revision)?.message ?? '';

  function getOptions(revisions: WorkspaceFileRevision[], { path, revision }: FileRef, allowWorkingCopy: boolean) {
    const options: DropdownOption[] = allowWorkingCopy
      ? [{ display: 'Working copy', subtitle: 'Latest saved file', value: WORKING_COPY }]
      : [];
    options.push({
      display: 'Latest revision',
      subtitle: 'Newest revision when the file is read',
      value: LATEST_REVISION,
    });
    for (const { createdAt, createdBy, message, name } of revisions) {
      const display = `${getFileRefRevisionLabel({ path, revision: `${name}` })}${message ? ` — ${message}` : ''}`;
      options.push({
        display,
        subtitle: `${createdBy ?? 'Unknown'} · ${getShortISOForDate(new Date(createdAt))}Z`,
        title: message || display,
        value: `${name}`,
      });
    }
    // A pinned revision stays selected (and shown) even when it isn't in the list, e.g. before the list has loaded
    if (revision !== undefined && !options.some(({ value }) => value === revision)) {
      options.push({ display: getFileRefRevisionLabel({ path, revision }), value: revision });
    }
    return options;
  }

  function onChange({ detail }: CustomEvent<SelectedDropdownOptionValue[]>) {
    dispatch(
      'change',
      detail[0] === WORKING_COPY ? { path: fileRef.path } : { path: fileRef.path, revision: `${detail[0]}` },
    );
  }
</script>

<div class="w-[120px] shrink-0" role="group" aria-label="Revision of {fileRef.path}">
  <SearchableDropdown
    emptyMessage={error || loading || revisions?.length === 0 ? '' : undefined}
    maxListHeight="min(260px, 40vh)"
    maxMenuWidth={360}
    placeholder="Select revision"
    searchPlaceholder="Search revisions"
    selectedOptionLabel={getFileRefRevisionLabel(fileRef)}
    selectedOptionValues={selectedValues}
    selectTooltip={description}
    showPlaceholderOption={false}
    {options}
    on:change={onChange}
  >
    <ChevronDownIcon slot="icon" />
    <svelte:fragment slot="status">
      {#if error}
        Couldn't load revisions. <button class="underline" on:click={() => history.load(fileRef.path, $user, true)}
          >Retry</button
        >
      {:else if loading}
        Loading revisions…
      {:else if revisions?.length === 0}
        No revisions available for this file
      {/if}
    </svelte:fragment>
  </SearchableDropdown>
</div>
