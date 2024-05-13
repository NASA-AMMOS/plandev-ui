<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { User, UserId } from '../../../types/app';
  import type { PlanCollaboratorTag, Tag, TagGroup, TagsChangeEvent } from '../../../types/tags';
  import type { ActionArray } from '../../../utilities/useActions';
  import TagsInput from './TagsInput.svelte';
  import UserInputRow from './UserInputRow.svelte';

  export let allowMultiple: boolean = true;
  export let placeholder: string = 'Search users';
  export let selectedUsers: UserId[] = [];
  export let tagDisplayName = 'user';
  export let userGroups: UserGroup[] = [];
  export let users: UserId[] = [];
  export let user: User | null;
  export let use: ActionArray = [];

  type UserGroup = {
    name: string;
    users: UserId[];
  };

  const dispatch = createEventDispatcher<{
    create: UserId[];
    delete: string;
  }>();

  let inputRef: TagsInput | null;
  let selectedUsersMap: Record<string, boolean> = {};
  let displayableUsers: UserId[] = [];
  let displayableUserGroups: UserGroup[] = [];
  let options: (Tag | TagGroup)[] = [];
  let selected: Tag[] = [];

  $: selectedUsersMap = selectedUsers.reduce(
    (prevMap, userId) => ({
      ...prevMap,
      [`${userId}`]: true,
    }),
    {},
  );
  $: userIsSelected = (userId: UserId) => {
    return selectedUsersMap[`${userId}`];
  };
  $: displayableUsers = users.filter(user => !userIsSelected(user));
  $: displayableUserGroups = userGroups.filter(({ users }) => {
    return users.filter(user => !userIsSelected(user)).length > 0;
  });
  $: {
    let newOptions: (Tag | TagGroup)[] = displayableUsers.map(userToTag);
    displayableUserGroups.forEach(userGroup => {
      newOptions.push(groupToTag(userGroup));
    });

    options = newOptions.sort((optionA, optionB) => {
      if ((optionA as TagGroup).members !== undefined && (optionB as TagGroup).members === undefined) {
        return -1;
      }
      if ((optionA as TagGroup).members === undefined && (optionB as TagGroup).members !== undefined) {
        return 1;
      }
      return optionA.name < optionB.name ? -1 : 0;
    });
  }

  $: selected = selectedUsers.map(user => userToTag(user));

  function getTagName(tag: Tag): string {
    return tag.name;
  }

  function compareTags(tagA: PlanCollaboratorTag, tagB: PlanCollaboratorTag): boolean {
    return getTagName(tagA) === getTagName(tagB);
  }

  function addTag(tag: Tag | TagGroup) {
    inputRef?.closeSuggestions();
    inputRef?.updatePopperPosition();
    let newUsers: UserId[] = [];
    const members = (tag as TagGroup).members;
    if (!members) {
      // Username case
      newUsers.push(tag.name);
    } else {
      members.forEach(userId => {
        if (!userIsSelected(userId)) {
          newUsers.push(userId);
        }
      });
    }

    if (user) {
      dispatch('create', newUsers);
      displayableUsers = displayableUsers.filter(user => !newUsers.find(newUser => newUser === user));
      selected = selected.concat(newUsers.map(newUser => userToTag(newUser)));
    }
  }

  function userToTag(userId: UserId): Tag {
    return {
      color: '#EBECEC',
      created_at: '',
      id: -1,
      name: userId || 'Unk',
      owner: '',
    };
  }

  function groupToTag(group: UserGroup): TagGroup {
    return {
      color: '#EBECEC',
      created_at: '',
      id: -1,
      members: group.users.map(user => `${user}`),
      name: group.name,
      owner: '',
    };
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      dispatch('delete', tag.name);
    }
  }
</script>

<TagsInput
  bind:this={inputRef}
  {addTag}
  {allowMultiple}
  ignoreCase={false}
  {placeholder}
  creatable={false}
  {tagDisplayName}
  {compareTags}
  {getTagName}
  {options}
  {selected}
  minWidth={168}
  on:change={onTagsInputChange}
  let:prop={tag}
  {use}
>
  <UserInputRow {tag} {selectedUsers} />
</TagsInput>

<style>
</style>
