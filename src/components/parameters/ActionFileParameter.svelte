<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FileRef } from '../../types/actions';
  import type { SelectedDropdownOptionValue } from '../../types/dropdown';
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import { allowsWorkingCopy, formatFileRef, getDefaultFileRef, isFileRef } from '../../utilities/actions';
  import { pluralize } from '../../utilities/text';
  import type { ActionArray } from '../../utilities/useActions';
  import FileRevisionSelect from './FileRevisionSelect.svelte';
  import ParameterBaseDropdown from './ParameterBaseDropdown.svelte';

  /**
   * A file or sequence action parameter that sets `withRevision`: the usual file dropdown, plus a revision menu for
   * each selected file. Its value is a `FileRef` (a `FileRef[]` when multiple) rather than a path.
   */
  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let hideRightAdornments: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'action';
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher<{ change: FormParameter }>();

  $: allowWorkingCopy = allowsWorkingCopy(formParameter.schema);
  $: multiple = formParameter.schema.type === 'options-multiple';
  $: fileRefs = [formParameter.value ?? []].flat().filter(isFileRef) as FileRef[];
  // What the file dropdown shows: the selected paths, or in run details the paths with their revisions as text.
  $: shown = disabled ? fileRefs.map(formatFileRef) : fileRefs.map(({ path }) => path);
  $: dropdownParameter = { ...formParameter, value: multiple ? shown : (shown[0] ?? null) };

  function dispatchFileRefs(newFileRefs: FileRef[]) {
    dispatch('change', { ...formParameter, value: multiple ? newFileRefs : newFileRefs[0] });
  }

  // Files that stay selected keep their revision; newly selected files start on the default one.
  function onSelectFiles({ detail }: CustomEvent<FormParameter>) {
    const paths: SelectedDropdownOptionValue[] = [detail.value].flat().filter(path => path != null);
    dispatchFileRefs(
      paths.map(
        path => fileRefs.find(fileRef => fileRef.path === path) ?? getDefaultFileRef(formParameter.schema, `${path}`),
      ),
    );
  }

  function onChangeRevision(fileRef: FileRef) {
    dispatchFileRefs(fileRefs.map(existing => (existing.path === fileRef.path ? fileRef : existing)));
  }
</script>

<div class="min-w-0">
  <ParameterBaseDropdown
    allowMultiple={multiple}
    {disabled}
    {hideRightAdornments}
    {labelColumnWidth}
    {level}
    {levelPadding}
    formParameter={dropdownParameter}
    {parameterType}
    placeholderText={multiple ? 'Select files' : undefined}
    selectedOptionLabel={multiple && fileRefs.length > 0
      ? `${fileRefs.length} file${pluralize(fileRefs.length)} selected`
      : ''}
    {use}
    on:change={onSelectFiles}
    on:reset
  >
    <svelte:fragment slot="trailing">
      {#if !multiple && !disabled && fileRefs[0]}
        <FileRevisionSelect
          {allowWorkingCopy}
          fileRef={fileRefs[0]}
          on:change={({ detail }) => onChangeRevision(detail)}
        />
      {/if}
    </svelte:fragment>
  </ParameterBaseDropdown>
  {#if multiple && !disabled && fileRefs.length > 0}
    <ul
      class="-mt-2 mb-1 flex max-h-40 min-w-0 flex-col gap-1 overflow-y-auto rounded rounded-t-none border bg-secondary/50 px-1.5 py-1 pt-3 text-xs"
      style="margin-left: calc({labelColumnWidth}px - {level * levelPadding}px)"
      aria-label="Revisions of {formParameter.name}"
    >
      {#each fileRefs as fileRef (fileRef.path)}
        <li class="flex items-center justify-between gap-2">
          <span class="min-w-0 flex-1 truncate" title={fileRef.path}>{fileRef.path}</span>
          <FileRevisionSelect {allowWorkingCopy} {fileRef} on:change={({ detail }) => onChangeRevision(detail)} />
        </li>
      {/each}
    </ul>
  {/if}
</div>
