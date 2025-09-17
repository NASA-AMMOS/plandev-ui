<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { RadioButtonId } from '../../types/radio-buttons';
  import { getTarget } from '../../utilities/generic';
  import { convertDurationStringToInterval } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import RadioButton from '../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../ui/RadioButtons/RadioButtons.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { direction: 'LEFT' | 'RIGHT'; offsetStr: string };
  }>();

  let direction: 'LEFT' | 'RIGHT' = 'LEFT';
  let gapOffsetString: string = '0d 0h 0m 0s 0ms 0us';
  let gapOffsetError: string | null = '';
  let disabled: boolean = false;

  function onSetDirection(event: CustomEvent<{ id: RadioButtonId }>) {
    const {
      detail: { id },
    } = event;
    direction = id as 'LEFT' | 'RIGHT';
  }

  function confirm() {
    dispatch('confirm', { direction, offsetStr: gapOffsetString });
  }

  function onUpdateStartOffset(event: Event) {
    const { value } = getTarget(event);
    try {
      convertDurationStringToInterval(`${value}`);
      gapOffsetError = `${value}`.includes('-') ? 'Negative offsets are not allowed' : '';
    } catch (error: any) {
      gapOffsetError = error.message;
    }
  }
</script>

<Modal height="auto" width={350}>
  <ModalHeader on:close>Pack Directive(s)</ModalHeader>
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
        class="label"
        use:tooltip={{ content: 'The gap between directives when packed ', placement: 'top' }}
        for="gap-offset"
      >
        Offset
      </label>
      <input
        class="st-input shift-input"
        class:error={!!gapOffsetError}
        {disabled}
        name="gap-offset"
        bind:value={gapOffsetString}
        on:change={onUpdateStartOffset}
        use:tooltip={{ content: gapOffsetError, placement: 'top' }}
      />
    </Input>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}>Cancel</button>
    <button class="st-button" on:click={confirm} disabled={!!gapOffsetError}>Pack</button>
  </ModalFooter>
</Modal>
