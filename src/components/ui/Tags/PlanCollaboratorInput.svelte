<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { User, UserId } from '../../../types/app';
  import type { Plan, PlanCollaborator, PlanCollaboratorSlim, PlanSlimmer } from '../../../types/plan';
  import type { ActionArray } from '../../../utilities/useActions';
  import UserInput from './UserInput.svelte';

  export let collaborators: PlanCollaboratorSlim[] = [];
  export let users: UserId[] = [];
  export let plans: PlanSlimmer[] = [];
  export let plan: Plan;
  export let user: User | null;
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher<{
    create: PlanCollaborator[];
    delete: string;
  }>();

  let groups: {
    name: string;
    users: UserId[];
  }[] = [];

  $: allowableCollaborators = users.filter(user => {
    return !collaborators.find(collaborator => collaborator.collaborator === user);
  });

  $: if (users) {
    let newGroupOptions: {
      name: string;
      users: UserId[];
    }[] = [];

    [...plans]
      .sort((planA, planB) => {
        return planA.updated_at > planB.updated_at ? -1 : 1;
      })
      .forEach(p => {
        // Filter out current plan
        if (p.id !== plan.id) {
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
    const newCollaborators: PlanCollaborator[] = [];

    newUsers.forEach(user => {
      newCollaborators.push({ collaborator: user, plan_id: plan.id });
    });

    if (user) {
      dispatch('create', newCollaborators);
      allowableCollaborators = allowableCollaborators.filter(
        collaborator => !newCollaborators.find(c => c.collaborator === collaborator),
      );
    }
  }
</script>

<UserInput
  placeholder="Search collaborators or plans"
  selectedUsers={collaborators.map(({ collaborator }) => collaborator)}
  tagDisplayName="collaborator"
  userGroups={groups}
  users={allowableCollaborators}
  {use}
  {user}
  on:create={addTag}
  on:delete
/>

<style>
</style>
