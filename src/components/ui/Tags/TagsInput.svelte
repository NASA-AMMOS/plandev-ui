<svelte:options immutable={true} accessors={true} />

<script lang="ts">
  import type { ModifierPhases, State } from '@popperjs/core';
  import { createEventDispatcher } from 'svelte';
  import { createPopperActions } from 'svelte-popperjs';
  import type { Tag, TagChangeType } from '../../../types/tags';
  import { generateRandomPastelColor } from '../../../utilities/color';
  import { useActions, type ActionArray } from '../../../utilities/useActions';
  import TagChip from './Tag.svelte';

  export let addTag: (tag: Tag, changeType: TagChangeType) => void = (
    tag: Tag,
    changeType: TagChangeType = 'select',
  ) => {
    selectedTags = selectedTags.concat(tag);
    searchText = '';
    dispatch('change', { tag, type: changeType });
    updatePopperPosition();
    closeSuggestions();
  };
  export let createTagObject: (name: string) => Tag = (name: string) => {
    return { color: generateRandomPastelColor(), created_at: '', id: -1, name, owner: '' };
  };
  export let creatable: boolean = true;
  export let compareTags = (tagA: Tag, tagB: Tag) => tagA.id === tagB.id;
  export let disabled: boolean = false;
  export let getTagName = (tag: Tag) => tag.name;
  export let id: string = '';
  export let ignoreCase: boolean = true;
  export let inputRef: HTMLInputElement | null = null;
  export let minWidth: number = 82;
  export let name: string = '';
  export let placeholder: string = 'Enter a tag...';
  export let selected: Tag[] = [];
  export let tagDisplayName: string = 'tag';
  export let suggestionsLimit: number = 8;
  export let tagsRef: HTMLDivElement | null = null;
  export let options: Tag[] = [];
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher<{
    change: {
      tag: Tag;
      type: TagChangeType;
    };
  }>();
  const [popperRef, popperContent, getInstance] = createPopperActions({
    placement: 'bottom-start',
    strategy: 'fixed',
  });
  const extraOpts = {
    modifiers: [
      { name: 'offset', options: { offset: [0, 8] } },
      {
        // This modifier ensures that the width of the popper is the same as the width of the referenced container
        enabled: true,
        fn: ({ state }: { state: State }) => {
          state.styles.popper.width = `${state.rects.reference.width}px`;
        },
        name: 'sameWidth',
        phase: 'beforeWrite' as ModifierPhases,
        requires: ['computeStyles'],
      },
    ],
  };

  let activeIndex: number = -1;
  let activeTag: Tag | null = null;
  let exactMatchFound: boolean = false;
  let filteredOptions: Tag[] = [];
  let searchText: string | null = '';
  let suggestionsVisible = false;
  let selectedTags: Tag[] = [];
  let tagsWidth: number = 100;

  $: selectedTags = [...selected]; // copy of selected prop for internal reference and temporary modification
  $: if (options && searchText !== null) {
    // Determine if searchText exactly matches any of the available options
    exactMatchFound = options.findIndex(tag => compareTagNames(getTagName(tag), searchText || '', ignoreCase)) > -1;

    filteredOptions = [];
    options.forEach(option => {
      // Filter out already selected options
      if (findTag(getTagName(option), selectedTags, ignoreCase)) {
        activeTag = option;
        return;
      }

      // Filter to match searchText, case insensitive, true if there's an empty string
      let matchesSubstring = false;
      if (!searchText) {
        matchesSubstring = true;
      } else {
        if (ignoreCase) {
          matchesSubstring = getTagName(option).indexOf(searchText) > -1;
        } else {
          matchesSubstring = getTagName(option).toLocaleLowerCase().indexOf(searchText.toLocaleLowerCase()) > -1;
        }
      }

      if (matchesSubstring) {
        filteredOptions.push(option);
      }
    });

    // If searchText matches one of the filtered options, bring this option to the top
    const optionMatchIndex = filteredOptions.findIndex(tag => compareTagNames(tag.name, searchText || '', ignoreCase));
    if (optionMatchIndex > -1) {
      filteredOptions.unshift(filteredOptions.splice(optionMatchIndex, 1)[0]);
    }

    // Limit filtered options for display purposes
    filteredOptions = filteredOptions.slice(0, suggestionsLimit);
  }

  $: if (typeof activeIndex === 'number' && filteredOptions) {
    activeTag = activeIndex > -1 ? filteredOptions.at(activeIndex) || null : null;
  }

  function removeTag(tag: Tag) {
    dispatch('change', { tag, type: 'remove' });
    updatePopperPosition();
  }

  function openSuggestions() {
    if (disabled) {
      return;
    }
    suggestionsVisible = true;
  }

  export function closeSuggestions() {
    suggestionsVisible = false;
    activeIndex = -1;
    searchText = '';
  }

  function compareTagNames(name1: Tag['name'], name2: Tag['name'], ignoreCase: boolean) {
    if (ignoreCase) {
      return name1.toLocaleLowerCase() === name2.toLocaleLowerCase();
    }
    return name1 === name2;
  }

  function findTag(name: string, tags: Tag[], ignoreCase: boolean) {
    return tags.find(t => compareTagNames(getTagName(t), name, ignoreCase));
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;

    // Prevent submission of any parent forms on enter
    if (key === 'Enter') {
      event.preventDefault();
    }

    // on escape or tab out of input close options dropdown and reset input value
    if (event.key === `Escape` || event.key === `Tab`) {
      closeSuggestions();
    } else if (key === 'Enter' && (searchText || activeTag)) {
      // prevent add if searchText matches tag name that is already selected
      if (searchText && !activeTag && findTag(searchText, selectedTags, ignoreCase)) {
        return;
      }

      // Use active tag or create a placeholder tag if needed
      const existingTag = activeTag || findTag(searchText || '', filteredOptions, ignoreCase);
      const changeEvent = existingTag ? 'select' : 'create';
      if (existingTag) {
        addTag(existingTag, changeEvent);
      } else if (creatable) {
        addTag(createTagObject(searchText || ''), changeEvent);
      }
    } else if (key === 'Backspace' && searchText === '' && selectedTags.length) {
      const lastTag = selectedTags.at(-1);
      selectedTags = selectedTags.slice(0, -1);
      if (lastTag) {
        removeTag(lastTag);
      }
      return;
    } else if ([`ArrowDown`, `ArrowUp`].includes(event.key)) {
      event.preventDefault();

      // No navigation possible if there are no options
      if (filteredOptions.length === 0) {
        return;
      }

      // if no option is active yet, but there are matching options, make first one active
      if (activeIndex === -1 && filteredOptions.length > 0) {
        activeIndex = 0;
        openSuggestions();
        return;
      }

      // if none of the above special cases apply, we make next/prev option
      // active with wrap around at both ends
      const increment = event.key === `ArrowUp` ? -1 : 1;

      activeIndex = (activeIndex + increment) % filteredOptions.length;
      if (activeIndex < 0) {
        activeIndex = filteredOptions.length - 1;
      }
    } else {
      openSuggestions();
    }
  }

  function onTagRemove(tag: Tag) {
    // Find the tag by name since it may not have an ID yet
    selectedTags = selectedTags.filter(t => getTagName(t) !== getTagName(tag));
    removeTag(tag);
  }

  function onClickOutside(event: MouseEvent | TouchEvent) {
    if (tagsRef && !tagsRef.contains(event.target as Node)) {
      closeSuggestions();
    }
  }

  export function updatePopperPosition() {
    getInstance()?.update();
  }
</script>

<svelte:window on:click|capture={onClickOutside} on:touchstart|capture={onClickOutside} />

<div
  class="tags-input"
  class:disabled
  use:useActions={use}
  use:popperRef
  bind:this={tagsRef}
  bind:clientWidth={tagsWidth}
>
  <div class="tags-input-selected-items">
    {#each selectedTags as tag}
      <TagChip {tag} removable={!disabled} on:click={() => onTagRemove(tag)} {disabled} ariaRole="option" />
    {/each}
    {#if !disabled || (disabled && !selectedTags.length)}
      <input
        {id}
        {name}
        {disabled}
        placeholder={disabled ? '' : placeholder}
        class="st-input"
        style:min-width={`${minWidth}px`}
        on:mouseup={openSuggestions}
        on:focus={openSuggestions}
        on:keydown|stopPropagation={onKeydown}
        bind:value={searchText}
        bind:this={inputRef}
      />
    {/if}
  </div>
  {#if suggestionsVisible}
    <div class="tags-input-portal" use:popperContent={extraOpts}>
      <ul class="tags-input-options" role="listbox">
        {#if filteredOptions.length}
          <div class="tags-input-option tag-header st-typography-label">Suggestions</div>
          {#each filteredOptions as tag}
            <li
              role="option"
              class="tags-input-option"
              on:mousedown|stopPropagation
              on:mouseup|stopPropagation={() => addTag(tag, 'select')}
              aria-selected={activeTag ? compareTags(activeTag, tag) : false}
              class:active={activeTag ? compareTags(activeTag, tag) : false}
            >
              {#if $$slots.default}
                <slot prop={tag} />
              {:else}
                <TagChip {disabled} {tag} removable={false} />
              {/if}
            </li>
          {/each}
        {/if}
        {#if !exactMatchFound && searchText}
          {#if creatable}
            <div
              on:mousedown|stopPropagation
              on:mouseup|stopPropagation={() => addTag(createTagObject(searchText || ''), 'create')}
              class="tags-input-option"
              role="button"
              tabindex={0}
            >
              Add "{searchText}" (enter)
            </div>
          {:else if !filteredOptions.length}
            <div class="tags-input-option tags-input-option-message">No matching {tagDisplayName} found</div>
          {/if}
        {/if}
        {#if !filteredOptions.length && exactMatchFound && searchText}
          <div class="tags-input-option tags-input-option-message">{searchText} already added</div>
        {/if}
        {#if !filteredOptions.length && !exactMatchFound && !searchText}
          <div class="tags-input-option tags-input-option-message">No other {tagDisplayName}s found</div>
        {/if}
      </ul>
    </div>
  {/if}
</div>

<style>
  .tags-input {
    background-color: var(--st-input-background-color);
    border: var(--st-input-border);
    border-radius: 4px;
    color: var(--st-input-color);
    display: flex;
    gap: 8px;
    max-height: 40vh;
    padding: 2px;
  }

  .tags-input.disabled,
  :global(.tags-input.permission-disabled) {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .tags-input.disabled input,
  :global(.tags-input.permission-disabled) input {
    cursor: not-allowed;
    opacity: 1;
  }

  .tags-input-selected-items {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 2px;
    margin: 0;
    padding: 0;
  }

  .tags-input input {
    background: none;
    border: none;
    flex: 1;
    height: 20px;
    outline: none;
    width: 100%;
  }

  .tags-input input[placeholder] {
    text-overflow: ellipsis;
  }

  .tags-input-portal {
    background: #ffffff;
    border: 1px solid var(--st-gray-20);
    border-radius: 10px;
    box-shadow: var(--st-shadow-popover);
    min-width: 150px;
    overflow: hidden;
    user-select: none;
    z-index: 99999;
  }

  .tags-input-options {
    margin: 0;
    padding: 0;
  }

  .tags-input-option {
    border-bottom: 1px solid var(--st-gray-20);
    cursor: pointer;
    display: flex;
    padding: 8px;
  }

  .tags-input-option.active,
  .tags-input-option:hover {
    background: var(--st-gray-10);
  }

  .tag-header {
    background: var(--st-gray-10);
    cursor: default;
  }

  .tags-input-option-message {
    cursor: default;
  }

  .tags-input-option-message:hover {
    background: inherit;
  }
</style>
