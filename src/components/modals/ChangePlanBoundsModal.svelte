<svelte:options immutable={true} />

<script lang="ts">
  import { LoaderCircle } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import { field } from '../../stores/form';
  import { plugins } from '../../stores/plugins';
  import type { User } from '../../types/app';
  import type { Plan, PlanSlim } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { computeDurationString, computePlanTimeUpdate } from '../../utilities/plan';
  import { convertDoyToYmd, formatDate, getDoyTime } from '../../utilities/time';
  import { required, validateStartTime } from '../../utilities/validators';
  import DatePickerField from '../form/DatePickerField.svelte';
  import Input from '../form/Input.svelte';
  import AlertError from '../ui/AlertError.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let plan: Plan | PlanSlim;
  export let user: User | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: void;
  }>();

  // Cross-field validators ensure end stays after start regardless of which field changed.
  async function validateStartTimeField(startTime: string) {
    const startDate = $plugins.time.primary.parse(startTime);
    const endDate = $plugins.time.primary.parse($endTimeField.value);
    if (!startDate || !endDate) {
      return null;
    }
    return validateStartTime(startDate.getTime(), endDate.getTime(), 'Plan');
  }

  async function validateEndTimeField(endTime: string) {
    const startDate = $plugins.time.primary.parse($startTimeField.value);
    const endDate = $plugins.time.primary.parse(endTime);
    if (!startDate || !endDate) {
      return null;
    }
    return validateStartTime(startDate.getTime(), endDate.getTime(), 'Plan');
  }

  const startTimeField = field<string>('', [required, $plugins.time.primary.validate, validateStartTimeField]);
  const endTimeField = field<string>('', [required, $plugins.time.primary.validate, validateEndTimeField]);

  let errorMessage: string | null = null;
  let inFlight: boolean = false;

  $: startTimeMs = $plugins.time.primary.parse($startTimeField.value)?.getTime();
  $: endTimeMs = $plugins.time.primary.parse($endTimeField.value)?.getTime();
  $: bothValid = $startTimeField.valid && $endTimeField.valid;
  $: durationString = computeDurationString(startTimeMs, endTimeMs, bothValid);

  // Compare against the plan's current bounds so we only submit a real change.
  $: planStartMs = new Date(plan.start_time).getTime();
  $: planEndYmd = convertDoyToYmd(plan.end_time_doy);
  $: planEndMs = planEndYmd ? new Date(planEndYmd).getTime() : NaN;
  $: changed = bothValid && (startTimeMs !== planStartMs || endTimeMs !== planEndMs);
  $: updateDisabled = !bothValid || !changed || inFlight;

  onMount(() => {
    startTimeField.validateAndSet(formatDate(new Date(plan.start_time), $plugins.time.primary.format));
    const endYmd = convertDoyToYmd(plan.end_time_doy);
    if (endYmd) {
      endTimeField.validateAndSet(formatDate(new Date(endYmd), $plugins.time.primary.format));
    }
  });

  // Re-validate the opposite field so the cross-field error clears as soon as the range is valid.
  async function onStartChange() {
    await endTimeField.validateAndSet($endTimeField.value);
  }

  async function onEndChange() {
    await startTimeField.validateAndSet($startTimeField.value);
  }

  function close() {
    if (!inFlight) {
      dispatch('close');
    }
  }

  async function confirm() {
    if (updateDisabled) {
      return;
    }
    const startDate = $plugins.time.primary.parse($startTimeField.value);
    const endDate = $plugins.time.primary.parse($endTimeField.value);
    if (!startDate || !endDate) {
      return;
    }
    const planTimeUpdate = computePlanTimeUpdate(getDoyTime(startDate), getDoyTime(endDate));
    if (!planTimeUpdate) {
      return;
    }

    inFlight = true;
    errorMessage = null;
    const updated = await effects.updatePlanTimeBounds(plan, planTimeUpdate, user);
    inFlight = false;

    if (updated) {
      dispatch('confirm');
    } else {
      errorMessage = 'Failed to update the plan time range. Please try again.';
    }
  }
</script>

<Modal closeOnEscape={!inFlight} closeOnOutsideClick={!inFlight} height="auto" width={480} on:close={close}>
  <ModalHeader showClose={!inFlight} on:close={close}>Change Plan Time Range</ModalHeader>
  <ModalContent>
    <p class="warning">
      Activity directives will remain fixed in absolute time — their start offsets are adjusted automatically. Plan
      snapshots and simulation results are also fixed and will not move.
    </p>

    {#if errorMessage}
      <AlertError class="mb-3" error={errorMessage} />
    {/if}

    <DatePickerField
      disabled={inFlight}
      field={startTimeField}
      label={`Start Time (${$plugins.time.primary.label})`}
      layout="inline"
      name="boundsStartTime"
      on:change={onStartChange}
      useFallback={!$plugins.time.enableDatePicker}
    />
    <DatePickerField
      disabled={inFlight}
      field={endTimeField}
      label={`End Time (${$plugins.time.primary.label})`}
      layout="inline"
      name="boundsEndTime"
      on:change={onEndChange}
      useFallback={!$plugins.time.enableDatePicker}
    />
    <Input layout="inline">
      <label for="boundsDuration">Plan Duration</label>
      <input class="st-input w-full" disabled id="boundsDuration" name="boundsDuration" value={durationString} />
    </Input>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" disabled={inFlight} on:click={close}>Cancel</button>
    <button class="st-button flex items-center gap-1" disabled={updateDisabled} on:click={confirm}>
      {#if inFlight}
        <LoaderCircle size={14} class="animate-spin" />
      {/if}
      Update Time Range
    </button>
  </ModalFooter>
</Modal>

<style>
  .warning {
    color: var(--st-gray-60);
    margin-bottom: 1rem;
  }
</style>
