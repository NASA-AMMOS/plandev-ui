<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { UserRole } from '../../../types/app';
  import type { Tag, TagsChangeEvent } from '../../../types/tags';
  import { ADMIN_ROLE, getRoleDisplayName } from '../../../utilities/roles';
  import type { ActionArray } from '../../../utilities/useActions';
  import TagsInput from './TagsInput.svelte';

  export let disabled: boolean = false;
  export let name: string = '';
  export let roles: UserRole[] = [];
  export let selectedRoles: UserRole[] = [];
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher<{
    create: UserRole[];
    delete: UserRole;
  }>();

  let inputRef: TagsInput | null;
  let options: Tag[] = [];
  let knownRoles: UserRole[] = [];
  let roleByTagName: Record<string, UserRole> = {};
  let tagName: (role: UserRole) => string = getRoleDisplayName;
  let selected: Tag[] = [];

  // Tags are matched by name, so a role whose display name collides with another's is shown by its real name
  $: knownRoles = [...new Set([...roles, ...selectedRoles])];
  $: tagName = (role: UserRole) =>
    knownRoles.some(other => other !== role && getRoleDisplayName(other) === getRoleDisplayName(role))
      ? role
      : getRoleDisplayName(role);
  $: roleByTagName = Object.fromEntries(knownRoles.map(role => [tagName(role), role]));
  // Admins already have unconditional access, so there is nothing to grant them
  $: options = roles.filter(role => role !== ADMIN_ROLE && !selectedRoles.includes(role)).map(role => roleToTag(role));
  $: selected = selectedRoles.map(role => roleToTag(role));

  function roleToTag(role: UserRole): Tag {
    return { color: '#EBECEC', created_at: '', id: -1, name: tagName(role), owner: '' };
  }

  function addTag(tag: Tag) {
    inputRef?.closeSuggestions();
    inputRef?.updatePopperPosition();
    dispatch('create', [roleByTagName[tag.name]]);
  }

  function onTagsInputChange({ detail: { tag, type } }: TagsChangeEvent) {
    if (type === 'remove') {
      dispatch('delete', roleByTagName[tag.name]);
    }
  }
</script>

<TagsInput
  bind:this={inputRef}
  {addTag}
  boxClassName="max-h-none"
  className="w-full"
  compareTags={(tagA, tagB) => tagA.name === tagB.name}
  creatable={false}
  ignoreCase={false}
  minWidth={168}
  placeholder="Search roles"
  showPlaceholderIfDisabled
  tagDisplayName="role"
  {disabled}
  {name}
  {options}
  {selected}
  {use}
  on:change={onTagsInputChange}
/>
