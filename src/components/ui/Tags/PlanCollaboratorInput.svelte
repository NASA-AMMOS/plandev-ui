<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { User, UserId } from '../../../types/app';
  import type { Plan, PlanCollaborator, PlanCollaboratorSlim, PlanSlimmer } from '../../../types/plan';
  import type { PlanCollaboratorTag, Tag, TagsChangeEvent } from '../../../types/tags';
  import type { ActionArray } from '../../../utilities/useActions';
  import PlanCollaboratorInputRow from './PlanCollaboratorInputRow.svelte';
  import TagsInput from './TagsInput.svelte';

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

  let inputRef: TagsInput | null;
  let options: PlanCollaboratorTag[] = [];
  let selected: Tag[] = [];

  $: allowableCollaborators = users.filter(user => {
    return !collaborators.find(collaborator => collaborator.collaborator === user);
  });

  $: userIsCollaborator = (userId: UserId) => {
    return allowableCollaborators.indexOf(userId) < 0;
  };

  $: if (users) {
    let newOptions: PlanCollaboratorTag[] = users.map(userToTag);
    plans.forEach(p => {
      // Filter out current plan
      if (p.id !== plan.id) {
        newOptions.push(planToTag(p));
      }
    });
    // Filter out plans where owner and collaborators are already added
    newOptions = newOptions.filter(tag => {
      // If the tag is a user tag we don't need to filter on it
      if (!tag.plan) {
        return true;
      }
      // If owner is already a collaborator and there are no tag plan collaborators
      // then this tag can be skipped
      const ownerIsCollaborator = userIsCollaborator(tag.plan.owner);
      if (ownerIsCollaborator && tag.plan.collaborators.length < 1) {
        return false;
      }
      let anyTagCollaboratorsNotCollaborators = !!tag.plan.collaborators.find(
        collaborator => !userIsCollaborator(collaborator.collaborator),
      );
      return !ownerIsCollaborator || anyTagCollaboratorsNotCollaborators;
    });

    options = newOptions.sort((optionA, optionB) => {
      if (optionA.plan && !optionB.plan) {
        return -1;
      }
      if (!optionA.plan && optionB.plan) {
        return 1;
      }
      if (optionA.plan && optionB.plan) {
        return optionA.plan.updated_at > optionB.plan.updated_at ? -1 : 1;
      }
      return optionA.name < optionB.name ? -1 : 0;
    });
  }

  $: selected = collaborators.map(collaborator => userToTag(collaborator.collaborator));

  function getTagName(tag: PlanCollaboratorTag): string {
    return tag.plan ? tag.plan.name : tag.name;
  }

  function compareTags(tagA: PlanCollaboratorTag, tagB: PlanCollaboratorTag): boolean {
    return getTagName(tagA) === getTagName(tagB);
  }

  function addTag(tag: PlanCollaboratorTag) {
    inputRef?.closeSuggestions();
    inputRef?.updatePopperPosition();
    let newCollaborators: PlanCollaborator[] = [];
    const tagPlan = tag.plan;
    if (!tagPlan) {
      // Username case
      newCollaborators.push({ collaborator: tag.name, plan_id: plan.id });
    } else {
      // Add collaborators from plan if not already a collaborator on the target plan
      const tagPlanCollaborators = tagPlan.collaborators.map(c => c.collaborator);
      tagPlanCollaborators.forEach(userId => {
        if (!userIsCollaborator(userId)) {
          newCollaborators.push({ collaborator: userId, plan_id: plan.id });
        }
      });

      // Add plan owner if not already a collaborator in target/source plans
      if (!userIsCollaborator(tagPlan.owner) && tagPlanCollaborators.indexOf(tagPlan.owner) < 0) {
        newCollaborators.push({ collaborator: tagPlan.owner, plan_id: plan.id });
      }
    }
    if (user) {
      dispatch('create', newCollaborators);
      allowableCollaborators = allowableCollaborators.filter(
        collaborator => !newCollaborators.find(c => c.collaborator === collaborator),
      );
      selected = selected.concat(newCollaborators.map(c => userToTag(c.collaborator)));
    }
  }

  function userToTag(userId: UserId): PlanCollaboratorTag {
    return {
      color: '#EBECEC',
      created_at: '',
      id: -1,
      name: userId || 'Unk',
      owner: '',
    };
  }

  function planToTag(plan: PlanSlimmer): PlanCollaboratorTag {
    return {
      color: '#EBECEC',
      created_at: '',
      id: -1,
      name: '',
      owner: '',
      plan,
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
  ignoreCase={false}
  placeholder="Search collaborators or plans"
  creatable={false}
  tagDisplayName="collaborator"
  {compareTags}
  {getTagName}
  {options}
  {selected}
  minWidth={168}
  on:change={onTagsInputChange}
  let:prop={tag}
  {use}
>
  <PlanCollaboratorInputRow {tag} {collaborators} />
</TagsInput>

<style>
</style>
