<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import UntypedTags from 'svelte-tags-input';

  export let autocompleteValues: string[] = [];
  export let name: string = '';
  export let placeholder: string = 'Enter a tag...';
  export let disabled: boolean = false;
  export let tags: string[] = [];
  // TODO enforce or add prop for max items shown in autocomplete list?

  const dispatch = createEventDispatcher();

  let container: HTMLDivElement | null;
  let input: HTMLInputElement | null;

  let Tags: any = UntypedTags;

  function handleTags(event: CustomEvent) {
    tags = event.detail.tags;
    dispatch('change', { tags });
  }

  function closeAutocomplete() {
    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('keyup'));
    }
  }

  function attemptCloseAutocomplete(event: MouseEvent | FocusEvent) {
    // Find autocomplete element
    const autocompleteElement = container.getElementsByClassName('svelte-tags-input-matchs-parent');

    // If element does not exist it is not showing in the DOM
    if (autocompleteElement.length !== 1) {
      return;
    }

    // Close autocomplete by resetting the input value and triggering a keyup
    // if the event target is not contained by the Tags container and is not
    // part of the autocomplete element (which is not visually contained by the Tags container)
    if (
      event.target instanceof Element &&
      container &&
      !container.contains(event.target) &&
      !autocompleteElement[0].contains(event.target)
    ) {
      closeAutocomplete();
    }
  }

  onMount(() => {
    try {
      document.addEventListener('click', attemptCloseAutocomplete);
      document.addEventListener('focusin', attemptCloseAutocomplete);

      // Disable HTML autocomplete for this field
      input = container.getElementsByTagName('input')[0];
      input.autocomplete = 'off';
    } catch (err) {
      console.error(err);
    }
  });

  onDestroy(() => {
    // Ensure value is cleared;
    if (input) {
      input.value = '';
    }

    // Close autocomplete
    closeAutocomplete();
    document.removeEventListener('click', attemptCloseAutocomplete);
    document.removeEventListener('focusin', attemptCloseAutocomplete);
  });
</script>

<div bind:this={container}>
  <Tags
    on:tags={handleTags}
    allowPaste={true}
    allowDrop={true}
    onlyUnique={true}
    autoComplete={autocompleteValues}
    disable={disabled}
    {placeholder}
    {tags}
    {name}
  />
</div>

<style>
  :global(.svelte-tags-input-layout) {
    background-color: var(--st-input-background-color) !important;
    border: var(--st-input-border) !important;
    border-radius: 4px !important;
    color: var(--st-input-color) !important;
    display: flex;
    gap: 4px;
    padding: 3px 4px !important;
  }

  :global(.svelte-tags-input) {
    background: inherit;
    font-family: var(--st-input-font-family) !important;
    font-size: var(--st-input-font-size) !important;
    font-weight: var(--st-input-font-weight) !important;
    letter-spacing: var(--st-input-letter-spacing) !important;
    line-height: var(--st-input-line-height) !important;
    margin: 0 !important;
    padding: 0 !important;
    padding-left: 2px !important;
  }

  :global(.svelte-tags-input-tag) {
    background-color: #e0e8f9 !important;
    border-radius: 2px !important;
    color: var(--st-typography-body-color) !important;
    cursor: default !important;
    font-family: var(--st-typography-body-font-family) !important;
    font-size: var(--st-typography-body-font-size) !important;
    font-weight: var(--st-typography-body-font-weight) !important;
    gap: 2px;
    letter-spacing: var(--st-typography-body-letter-spacing) !important;
    line-height: var(--st-typography-body-line-height) !important;
    margin-right: 0 !important;
    margin-top: 0 !important;
    padding: 0 !important;
    padding: 0px 0px 0px 2px !important;
    white-space: normal !important;
  }

  :global(.svelte-tags-input-tag-remove) {
    border-bottom-right-radius: 2px;
    border-top-right-radius: 2px;
    cursor: pointer;
    display: flex;
    font-weight: 600;
    justify-content: center;
    opacity: 0.5;
    padding: 0px 2px;
    width: 16px;
  }

  :global(.svelte-tags-input-tag-remove:hover) {
    background-color: #d0d9f1;
    opacity: 1;
  }

  :global(.svelte-tags-input-matchs) {
    overflow: auto !important;
    z-index: 1 !important;
  }

  :global(.sti-layout-disable) {
    opacity: 0.5;
  }

  :global(.sti-layout-disable .svelte-tags-input) {
    background-color: inherit !important;
  }

  :global(.sti-layout-disable > *) {
    cursor: not-allowed !important;
  }

  :global(.svelte-tags-input-matchs) {
    border: var(--st-input-border) !important;
    border: 1px solid var(--st-gray-20) !important;
    border-radius: 4px !important;
    box-shadow: 0px 4px 16px 0px rgb(0 0 0 / 8%) !important;
    margin-top: 4px !important;
    max-height: 200px !important;
    padding: 8px !important;
  }

  :global(.svelte-tags-input-matchs li) {
    color: var(--st-typography-body-color);
    font-family: var(--st-typography-body-font-family);
    font-size: var(--st-typography-body-font-size);
    font-weight: var(--st-typography-body-font-weight);
    letter-spacing: var(--st-typography-body-letter-spacing);
    line-height: var(--st-typography-body-line-height);
  }

  :global(.svelte-tags-input-matchs li strong) {
    color: var(--st-typography-bold-color);
    font-family: var(--st-typography-bold-font-family);
    font-size: var(--st-typography-bold-font-size);
    font-weight: var(--st-typography-bold-font-weight);
    letter-spacing: var(--st-typography-bold-letter-spacing);
    line-height: var(--st-typography-bold-line-height);
  }

  :global(.svelte-tags-input-matchs li:hover, .svelte-tags-input-matchs li:focus) {
    background: var(--st-gray-15) !important;
    color: inherit !important;
  }
</style>
