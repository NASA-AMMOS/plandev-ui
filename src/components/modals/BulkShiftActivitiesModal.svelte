<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { RadioButtonId } from '../../types/radio-buttons';
  import { getTarget } from '../../utilities/generic';
  import { convertDurationStringToInterval } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import Modal from '../modals/Modal.svelte';
  import ModalContent from '../modals/ModalContent.svelte';
  import ModalFooter from '../modals/ModalFooter.svelte';
  import ModalHeader from '../modals/ModalHeader.svelte';
  import RadioButton from '../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../ui/RadioButtons/RadioButtons.svelte';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: {
      direction: 'LEFT' | 'RIGHT';
      shiftOffsetStr: string;
    };
  }>();

  let direction: 'LEFT' | 'RIGHT' = 'LEFT';
  let shiftDurationString: string = '0d 0h 0m 0s 0ms 0us';
  let shiftOffsetError: string | null = '';
  let disabled: boolean = false;

  function onSetDirection(event: CustomEvent<{ id: RadioButtonId }>) {
    const {
      detail: { id },
    } = event;
    direction = id as 'LEFT' | 'RIGHT';
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

<Modal height="auto" width={350}>
  <ModalHeader on:close>Shift Directive(s)</ModalHeader>

  <ModalContent>
    <Input layout="inline">
      <div class="label">Direction</div>
      <RadioButtons selectedButtonId={direction} on:select-radio-button={onSetDirection}>
        <RadioButton id="LEFT">Left</RadioButton>
        <RadioButton id="RIGHT">Right</RadioButton>
      </RadioButtons>
    </Input>

    <Input layout="inline">
      <label
        use:tooltip={{ content: 'The duration of how much the activities should be shifted by', placement: 'top' }}
        for="gap-offset"
      >
        Shift By
      </label>
      <input
        class="st-input w-full"
        class:error={!!shiftOffsetError}
        {disabled}
        name="gap-offset"
        bind:value={shiftDurationString}
        on:change={onUpdateStartOffset}
        use:tooltip={{ content: shiftOffsetError, placement: 'top' }}
      />
    </Input>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}>Cancel</button>
    <button class="st-button" on:click={confirm} disabled={!!shiftOffsetError}>Shift</button>
  </ModalFooter>
</Modal>
