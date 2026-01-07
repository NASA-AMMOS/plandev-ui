<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { field } from '../../../stores/form';
  import { plugins } from '../../../stores/plugins';
  import { required } from '../../../utilities/validators';
  import DatePickerField from '../../form/DatePickerField.svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let defaultStartTime: string;
  export let defaultEndTime: string;

  const defaultStartDate = $plugins.time.primary.parse(defaultStartTime) ?? undefined;
  const defaultEndDate = $plugins.time.primary.parse(defaultEndTime) ?? undefined;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: { timeRangeEnd: string; timeRangeStart: string } };
  }>();

  $: startTimeField = field<string>(defaultStartTime, [required, $plugins.time.primary.validate]);
  $: endTimeField = field<string>(defaultEndTime, [required, $plugins.time.primary.validate]);

  function handleCancel() {
    open = false;
  }

  function handleConfirm() {
    open = false;
    dispatch('resolve', {
      confirm: true,
      value: { timeRangeEnd: `${$endTimeField.value}Z`, timeRangeStart: `${$startTimeField.value}Z` },
    });
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && open) {
      handleConfirm();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<StellarDialog bind:open size="sm" title="Create Sequence from Filter" on:close>
  <div class="grid gap-4">
    <div class="text-sm">Select the time range to apply the sequence filter to.</div>
    <p class="text-sm italic text-muted-foreground">
      All spans in the time range will be added to the new sequence!
    </p>
    <fieldset class="grid gap-2">
      <DatePickerField
        name="start-time"
        label={`Start Time - ${$plugins.time.primary.formatString}`}
        minDate={defaultStartDate}
        maxDate={defaultEndDate}
        field={startTimeField}
      />
    </fieldset>
    <fieldset class="grid gap-2">
      <DatePickerField
        name="end-time"
        label={`End Time - ${$plugins.time.primary.formatString}`}
        minDate={defaultStartDate}
        maxDate={defaultEndDate}
        field={endTimeField}
      />
    </fieldset>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons on:cancel={handleCancel} on:confirm={handleConfirm} />
  </svelte:fragment>
</StellarDialog>
