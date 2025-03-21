<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { field } from '../../stores/form';
  import { plugins } from '../../stores/plugins';
  import { required } from '../../utilities/validators';
  import DatePickerField from '../form/DatePickerField.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 225;
  export let width: number = 400;
  export let defaultStartTime: string;
  export let defaultEndTime: string;

  const defaultStartDate = $plugins.time.primary.parse(defaultStartTime) ?? undefined;
  const defaultEndDate = $plugins.time.primary.parse(defaultEndTime) ?? undefined;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { timeRangeEnd: string; timeRangeStart: string };
  }>();

  $: startTimeField = field<string>(defaultStartTime, [required, $plugins.time.primary.validate]);
  $: endTimeField = field<string>(defaultEndTime, [required, $plugins.time.primary.validate]);

  function onInputKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      onConfirm();
    }
  }

  function onConfirm() {
    dispatch('confirm', { timeRangeEnd: `${$endTimeField.value}Z`, timeRangeStart: `${$startTimeField.value}Z` });
  }
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Create Sequence from Filter</ModalHeader>
  <ModalContent>
    <div class="st-typography-body">Select the time range to apply the sequence filter to.</div>
    <i class="st-typography-label"> All spans in the time range will be added to the new sequence! </i>
    <fieldset>
      <DatePickerField
        name="start-time"
        label={`Start Time - ${$plugins.time.primary.formatString}`}
        minDate={defaultStartDate}
        maxDate={defaultEndDate}
        field={startTimeField}
      />
    </fieldset>
    <fieldset>
      <DatePickerField
        name="end-time"
        label={`End Time - ${$plugins.time.primary.formatString}`}
        minDate={defaultStartDate}
        maxDate={defaultEndDate}
        field={endTimeField}
      />
    </fieldset>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:keydown={onInputKeydown} on:click={onConfirm}> Confirm </button>
  </ModalFooter>
</Modal>

<style>
</style>
