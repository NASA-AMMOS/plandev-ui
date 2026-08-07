<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { RadioButtonId } from '../../../types/radio-buttons';
  import RadioButton from '../../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../../ui/RadioButtons/RadioButtons.svelte';

  export let options: { id: string; label: string }[] = [];
  export let selectedId: string | undefined = undefined;

  const dispatch = createEventDispatcher<{ change: { id: string } }>();

  function onSelect(event: CustomEvent<{ id: RadioButtonId }>) {
    dispatch('change', { id: `${event.detail.id}` });
  }
</script>

<!--
  A segmented control for the timeline editor's short option sets, in place of a dropdown.

  Worth the width it costs: it shows the alternatives without being opened, switches in one click
  instead of two, and holds each option at a fixed position so an operator can reach for the one they
  want rather than reading the list every time. A dropdown gives none of that back, and is the right
  control only where the options are too many or too long to sit side by side -- Show, whose third
  option is "Directives + Simulated", and Point Shape, which has five.

  Labelled rather than iconographic on purpose. Icons bought the same one-click switching but had to be
  learned first, and unlabelled they left an operator reading someone else's view with nothing to go on.
-->
<RadioButtons selectedButtonId={selectedId} on:select-radio-button={onSelect}>
  {#each options as option (option.id)}
    <RadioButton id={option.id}>{option.label}</RadioButton>
  {/each}
</RadioButtons>
