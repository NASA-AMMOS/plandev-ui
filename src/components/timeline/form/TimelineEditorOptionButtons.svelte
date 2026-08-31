<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { RadioButtonId } from '../../../types/radio-buttons';
  import RadioButton from '../../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../../ui/RadioButtons/RadioButtons.svelte';

  /**
   * Accessible name for the group, since the visible `<label>` beside it cannot name a radiogroup.
   * Include the visible label's text so the two do not disagree -- "Line Style" for a group labelled
   * "Style" under a Line heading.
   */
  export let ariaLabel: string | undefined = undefined;
  /** Makes the sibling `<label for>` resolve to a real element. */
  export let id: string = '';
  export let options: { id: string; label: string }[] = [];
  export let selectedId: string | undefined = undefined;

  const dispatch = createEventDispatcher<{ change: { id: string } }>();

  function onSelect(event: CustomEvent<{ id: RadioButtonId }>) {
    dispatch('change', { id: `${event.detail.id}` });
  }
</script>

<RadioButtons {ariaLabel} {id} selectedButtonId={selectedId} on:select-radio-button={onSelect}>
  {#each options as option (option.id)}
    <RadioButton id={option.id}>{option.label}</RadioButton>
  {/each}
</RadioButtons>
