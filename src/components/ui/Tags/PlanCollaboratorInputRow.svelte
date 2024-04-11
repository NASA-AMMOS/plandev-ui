<svelte:options immutable={true} />

<script lang="ts">
  import PersonIcon from '@nasa-jpl/stellar/icons/person.svg?component';
  import type { UserId } from '../../../types/app';
  import type { PlanCollaboratorSlim } from '../../../types/plan';
  import type { PlanCollaboratorTag } from '../../../types/tags';
  import { tooltip } from '../../../utilities/tooltip';
  import TagChip from './Tag.svelte';

  export let tag: PlanCollaboratorTag;
  export let disabled: boolean = false;
  export let collaborators: PlanCollaboratorSlim[];

  let planUsers: UserId[] = [];
  $: if (tag && tag.plan && collaborators) {
    planUsers = Array.from(new Set(tag.plan.collaborators.map(c => c.collaborator).concat(tag.plan.owner)));
  }
  $: collaboratorTooltipContent = planUsers.join(', ');
</script>

{#if tag.plan}
  <div class="as-plan" style="position: relative">
    <div class="plan">
      {tag.plan.name}
    </div>
    <div class="as-plan-tags">
      {#if planUsers.length > 0}
        <div use:tooltip={{ content: collaboratorTooltipContent, maxWidth: 320, placement: 'right', zIndex: 99999 }}>
          <TagChip {disabled} tag={{ ...tag, name: `${planUsers.length}` }} removable={false}>
            <div class="tag-chip-icon">
              <PersonIcon />
            </div>
          </TagChip>
        </div>
      {/if}
    </div>
  </div>
{:else}
  <TagChip {disabled} {tag} removable={false}>
    <div class="tag-chip-icon">
      <PersonIcon />
    </div>
  </TagChip>
{/if}

<style>
  .as-plan {
    align-items: center;
    display: flex;
    flex: 1;
    justify-content: space-between;
    overflow: hidden;
  }

  .as-plan-tags {
    display: flex;
    gap: 4px;
  }

  .plan {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag-chip-icon {
    align-items: center;
    display: flex;
    height: inherit;
    justify-content: center;
    margin-right: 4px;
    width: inherit;
  }

  .tag-chip-icon > :global(svg) {
    height: 12px;
    width: 12px;
  }
</style>
