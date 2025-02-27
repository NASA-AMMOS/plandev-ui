<svelte:options immutable={true} />

<script lang="ts">
  import BranchIcon from '@nasa-jpl/stellar/icons/branch.svg?component';
  import MergeIcon from '@nasa-jpl/stellar/icons/merge.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { Plan, PlanBranchRequestAction, PlanForMerging } from '../../types/plan';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';
  import DatePickerField from '../form/DatePickerField.svelte';
  import { plugins } from '../../stores/plugins';
  import { field } from '../../stores/form';
  import { required } from '../../utilities/validators';

  export let height: number = 225;
  export let width: number = 300;
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
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Time Range For Sequence</ModalHeader>
  <ModalContent>
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
    <button
      class="st-button"
      on:click={() => dispatch('confirm', { timeRangeStart: `${$startTimeField.value}Z`, timeRangeEnd: `${$endTimeField.value}Z` })}
    >
      Confirm
    </button>
  </ModalFooter>
</Modal>

<style>
</style>
