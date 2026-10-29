<svelte:options immutable={true} />

<script lang="ts">
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { getUserStore } from '../../stores/user';
  import { workspaceId } from '../../stores/workspaces';
  import type { FileRef } from '../../types/actions';
  import type { DropdownOption, SelectedDropdownOptionValue } from '../../types/dropdown';
  import type { WorkspaceFileRevision } from '../../types/workspace';
  import { getFileRefRevisionLabel } from '../../utilities/actions';
  import { getShortISOForDate } from '../../utilities/time';
  import { WorkspaceApi } from '../../utilities/workspaces';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';

  export let allowWorkingCopy: boolean = true;
  export let fileRef: FileRef;

  // Not a possible revision name (those are letters or numbers), and truthy as the dropdown requires
  const WORKING_COPY = 'working-copy';
  const dispatch = createEventDispatcher<{ change: FileRef }>();
  const user = getUserStore();

  // Revisions per file path, fetched the first time that file's menu is opened.
  let failedPath: string | null = null;
  let loadingPath: string | null = null;
  let revisionsByPath: Record<string, WorkspaceFileRevision[]> = {};

  $: revisions = revisionsByPath[fileRef.path];
  $: error = failedPath === fileRef.path;
  $: loading = loadingPath === fileRef.path;
  $: options = getOptions(revisions ?? [], fileRef, allowWorkingCopy);
  $: selectedValues = fileRef.revision === null ? (allowWorkingCopy ? [WORKING_COPY] : []) : [fileRef.revision];
  $: selectedMessage = revisions?.find(({ name }) => `${name}` === fileRef.revision)?.message;
  // The pinned revision's full description, as an element so its line breaks are kept and its width is capped.
  $: description = selectedMessage ? getDescriptionElement(selectedMessage) : '';
  // A pinned revision's description is needed for the tooltip before the menu is opened (e.g. on a re-run).
  $: if (fileRef.revision !== null && revisions === undefined) {
    load(fileRef.path);
  }

  function getDescriptionElement(message: string) {
    const element = document.createElement('div');
    element.style.cssText = 'max-width: 300px; overflow-wrap: anywhere; white-space: pre-wrap;';
    element.textContent = message;
    return element;
  }

  function getOptions(revisions: WorkspaceFileRevision[], { path, revision }: FileRef, allowWorkingCopy: boolean) {
    const options: DropdownOption[] = allowWorkingCopy
      ? [{ display: 'Working copy', subtitle: 'Latest saved file', value: WORKING_COPY }]
      : [];
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
    if (revision !== null && !options.some(({ value }) => value === revision)) {
      options.push({ display: getFileRefRevisionLabel({ path, revision }), value: revision });
    }
    return options;
  }

  async function load(path: string) {
    if (loadingPath === path) {
      return;
    }
    failedPath = null;
    loadingPath = path;
    try {
      const list = await WorkspaceApi.getFileRevisionList($workspaceId, path, $user);
      revisionsByPath = { ...revisionsByPath, [path]: list.revisions };
    } catch {
      failedPath = path;
    } finally {
      loadingPath = null;
    }
  }

  function onOpenMenu() {
    if (revisions === undefined) {
      load(fileRef.path);
    }
  }

  function onChange({ detail }: CustomEvent<SelectedDropdownOptionValue[]>) {
    dispatch('change', { path: fileRef.path, revision: detail[0] === WORKING_COPY ? null : `${detail[0]}` });
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
    on:openMenu={onOpenMenu}
  >
    <ChevronDownIcon slot="icon" />
    <svelte:fragment slot="status">
      {#if error}
        Couldn't load revisions. <button class="underline" on:click={() => load(fileRef.path)}>Retry</button>
      {:else if loading}
        Loading revisions…
      {:else if revisions?.length === 0}
        {allowWorkingCopy ? 'This file has no revisions yet' : 'This file has no revisions yet, so it can’t be used'}
      {/if}
    </svelte:fragment>
  </SearchableDropdown>
</div>
