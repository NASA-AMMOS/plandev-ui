<svelte:options immutable={true} />

<script lang="ts">
  import PersonIcon from '@nasa-jpl/stellar/icons/person.svg?component';
  import type { UserId } from '../../../types/app';
  import type { Tag, TagGroup } from '../../../types/tags';
  import { tooltip } from '../../../utilities/tooltip';
  import TagChip from './Tag.svelte';

  export let tag: Tag | TagGroup;
  export let disabled: boolean = false;
  export let selectedUsers: UserId[];

  let users: UserId[] = [];
  let tagGroup: TagGroup | null;
  let userGroupTooltip: string = '';

  $: if (tag && (tag as TagGroup).members !== undefined && selectedUsers) {
    const group: TagGroup = tag as TagGroup;
    users = Array.from(new Set(group.members.map(user => user)));
    tagGroup = group;
  } else {
    tagGroup = null;
  }
  $: userGroupTooltip = users.join(', ');
</script>

{#if tagGroup}
  <div class="as-group">
    <div class="group">
      {tagGroup.name}
    </div>
    <div class="as-group-tags">
      {#if users.length > 0}
        <div use:tooltip={{ content: userGroupTooltip, maxWidth: 320, placement: 'right', zIndex: 99999 }}>
          <TagChip {disabled} tag={{ ...tag, name: `${users.length}` }} removable={false}>
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
  .as-group {
    align-items: center;
    display: flex;
    flex: 1;
    justify-content: space-between;
    overflow: hidden;
    position: relative;
  }

  .as-group-tags {
    display: flex;
    gap: 4px;
  }

  .group {
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
