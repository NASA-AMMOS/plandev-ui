<svelte:options immutable={true} />

<script lang="ts">
  import { Input as InputStellar, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { RadioButtonId } from '../../../types/radio-buttons';
  import type { ActivityTransformDirection } from '../../../types/time';
  import { getTarget } from '../../../utilities/generic';
  import { convertDurationStringToInterval } from '../../../utilities/time';
  import RadioButton from '../../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../../ui/RadioButtons/RadioButtons.svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let title: string = '';
  export let subtitle: string = '';
  export let offsetLabel: string = 'Offset';

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: {
      confirm: boolean;
      value?: {
        direction: ActivityTransformDirection;
        offsetDuration: string;
      };
    };
  }>();

  let direction: ActivityTransformDirection = 'left';
  let durationString: string = '0d 0h 0m 0s 0ms 0us';
  let durationError: string | null = '';
  let disabled: boolean = false;

  function setDirection(event: CustomEvent<{ id: RadioButtonId }>) {
    direction = event.detail.id as ActivityTransformDirection;
  }

  function handleCancel() {
    open = false;
  }

  function handleConfirm() {
    open = false;
    dispatch('resolve', { confirm: true, value: { direction, offsetDuration: durationString } });
  }

  function onUpdateStartOffset(event: Event) {
    const { value } = getTarget(event);
    try {
      convertDurationStringToInterval(`${value}`);
      durationError = `${value}`.includes('-') ? 'Negative offsets are not allowed' : '';
    } catch (error: any) {
      durationError = error.message;
    }
  }
</script>

<StellarDialog bind:open size="auto" {title} on:close>
  <div class="flex min-w-min flex-col gap-4 py-2">
    <div class="whitespace-nowrap text-sm text-muted-foreground">
      {subtitle}
    </div>
    <div class="flex items-center justify-between gap-2">
      <Label size="sm" class="w-[100px] flex-shrink-0">Direction</Label>
      <RadioButtons selectedButtonId={direction} on:select-radio-button={setDirection}>
        <RadioButton id="left">Left</RadioButton>
        <RadioButton id="right">Right</RadioButton>
      </RadioButtons>
    </div>

    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between gap-2">
        <Label size="sm" class="flex w-[100px] flex-shrink-0 items-center gap-1">{offsetLabel}</Label>
        <InputStellar
          sizeVariant="xs"
          {disabled}
          name="gap-offset"
          bind:value={durationString}
          on:change={onUpdateStartOffset}
        />
      </div>
      {#if durationError}
        <div class="text-sm text-red-500">{durationError}</div>
      {/if}
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText="Apply"
      confirmDisabled={!!durationError}
      on:cancel={handleCancel}
      on:confirm={handleConfirm}
    />
  </svelte:fragment>
</StellarDialog>
