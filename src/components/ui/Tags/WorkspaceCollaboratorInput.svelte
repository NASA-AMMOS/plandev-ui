<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { User, UserId } from '../../../types/app';
  import type { Workspace, WorkspaceCollaborator } from '../../../types/workspace';
  import type { ActionArray } from '../../../utilities/useActions';
  import UserInput from './UserInput.svelte';

  export let collaborators: WorkspaceCollaborator[] = [];
  export let disabled: boolean = false;
  export let name: string = '';
  export let workspaces: Workspace[] = [];
  export let workspace: Workspace | null | undefined = null;
  export let users: UserId[] = [];
  export let user: User | null;
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher<{
    create: WorkspaceCollaborator[];
    delete: string;
  }>();

  let groups: {
    name: string;
    users: UserId[];
  }[] = [];

  $: allowableCollaborators = users.filter(user => {
    return !collaborators.find(collaborator => collaborator.collaborator === user);
  });

  $: if (users && workspace) {
    let newGroupOptions: {
      name: string;
      users: UserId[];
    }[] = [];

    [...workspaces]
      .sort((planA, planB) => {
        return planA.updated_at > planB.updated_at ? -1 : 1;
      })
      .forEach(p => {
        // Filter out current plan
        if (p.id !== workspace.id) {
          newGroupOptions.push({
            name: p.name,
            users: [...new Set([p.owner, ...p.collaborators.map(({ collaborator }) => `${collaborator}`)])],
          });
        }
      });

    groups = newGroupOptions;
  }

  function addTag(event: CustomEvent<UserId[]>) {
    const { detail: newUsers } = event;
    const newCollaborators: WorkspaceCollaborator[] = [];

    if (workspace) {
      newUsers.forEach(user => {
        newCollaborators.push({ collaborator: user, workspace_id: workspace.id });
      });
    }

    if (user) {
      dispatch('create', newCollaborators);
      allowableCollaborators = allowableCollaborators.filter(
        collaborator => !newCollaborators.find(c => c.collaborator === collaborator),
      );
    }
  }
</script>

<UserInput
  placeholder="Search collaborators or workspaces"
  selectedUsers={collaborators.map(({ collaborator }) => collaborator)}
  tagDisplayName="collaborator"
  userGroups={groups}
  users={allowableCollaborators}
  {name}
  {disabled}
  {use}
  {user}
  on:create={addTag}
  on:delete
/>

<style>
</style>
