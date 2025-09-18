<script lang="ts">
  import { Input as InputStellar, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { RadioButtonId } from '../../types/radio-buttons';
  import { getTarget } from '../../utilities/generic';
  import { convertDurationStringToInterval } from '../../utilities/time';
  import Modal from '../modals/Modal.svelte';
  import ModalContent from '../modals/ModalContent.svelte';
  import ModalFooter from '../modals/ModalFooter.svelte';
  import ModalHeader from '../modals/ModalHeader.svelte';
  import RadioButton from '../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../ui/RadioButtons/RadioButtons.svelte';

  type Direction = 'Left' | 'Right';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: {
      direction: Direction;
      shiftOffsetStr: string;
    };
  }>();

  let direction: Direction = 'Left';
  let shiftDurationString: string = '0d 0h 0m 0s 0ms 0us';
  let shiftOffsetError: string | null = '';
  let disabled: boolean = false;

  function setDirection(event: CustomEvent<{ id: RadioButtonId }>) {
    direction = event.detail.id as Direction;
  }

  function confirm() {
    dispatch('confirm', { direction, shiftOffsetStr: shiftDurationString });
  }

  function onUpdateStartOffset(event: Event) {
    const { value } = getTarget(event);
    try {
      convertDurationStringToInterval(`${value}`);
      shiftOffsetError = `${value}`.includes('-') ? 'Negative offsets are not allowed' : '';
    } catch (error: any) {
      shiftOffsetError = error.message;
    }
  }
</script>

<Modal height="min-content" width="min-content">
  <ModalHeader on:close>Shift Directive(s)</ModalHeader>

  <ModalContent>
    <div class="flex min-w-min flex-col gap-2">
      <div class="mb-2 whitespace-nowrap text-muted-foreground">
        Shift activity directives forwards or backwards in time.
      </div>
      <div class="flex items-center justify-between gap-2">
        <Label size="sm" class=" w-[100px] flex-shrink-0">Direction</Label>
        <RadioButtons selectedButtonId={direction} on:select-radio-button={setDirection}>
          <RadioButton id="Left">Left</RadioButton>
          <RadioButton id="Right">Right</RadioButton>
        </RadioButtons>
      </div>

      <div class="flex items-center justify-between gap-2">
        <Label size="sm" class="flex w-[100px] flex-shrink-0 items-center gap-1">Shift By</Label>
        <InputStellar
          sizeVariant="xs"
          {disabled}
          name="gap-offset"
          bind:value={shiftDurationString}
          on:change={onUpdateStartOffset}
        />
        {#if shiftOffsetError}
          <div>{shiftOffsetError}</div>
        {/if}
      </div>
    </div>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}>Cancel</button>
    <button class="st-button" on:click={confirm} disabled={!!shiftOffsetError}>Shift</button>
  </ModalFooter>
</Modal>
