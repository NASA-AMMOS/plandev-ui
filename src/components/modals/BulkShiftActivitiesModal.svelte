<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getTarget } from '../../utilities/generic';
  import { convertDurationStringToInterval } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Modal from '../modals/Modal.svelte';
  import ModalContent from '../modals/ModalContent.svelte';
  import ModalFooter from '../modals/ModalFooter.svelte';
  import ModalHeader from '../modals/ModalHeader.svelte';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: {
      direction: 'Left' | 'Right';
      shiftOffsetStr: string;
    };
  }>();

  let direction: 'Left' | 'Right' = 'Left';
  let shiftDurationString: string = '0d 0h 0m 0s 0ms 0us';
  let shiftOffsetError: string | null = '';
  let disabled: boolean = false;

  function setDirection(dir: 'Left' | 'Right') {
    direction = dir;
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

<div class="compact-modal">
  <Modal height={150} width={300}>
    <ModalHeader on:close>Shift Directive(s)</ModalHeader>

    <ModalContent>
      <div class="form-container">
        <div class="row">
          <div class="label">Direction</div>
          <div class="toggle-group">
            <button class="toggle {direction === 'Left' ? 'active' : ''}" on:click={() => setDirection('Left')}>
              Left
            </button>
            <button class="toggle {direction === 'Right' ? 'active' : ''}" on:click={() => setDirection('Right')}>
              Right
            </button>
          </div>
        </div>

        <div class="row">
          <label
            class="label"
            use:tooltip={{ content: 'The duration of how much the activities should be shifted by', placement: 'top' }}
            for="gap-offset"
          >
            Shift By:
          </label>
          <input
            class="st-input shift-input"
            class:error={!!shiftOffsetError}
            {disabled}
            name="gap-offset"
            bind:value={shiftDurationString}
            on:change={onUpdateStartOffset}
            use:tooltip={{ content: shiftOffsetError, placement: 'top' }}
          />
        </div>
      </div>
    </ModalContent>

    <ModalFooter>
      <button class="st-button secondary" on:click={() => dispatch('close')}>Cancel</button>
      <button class="st-button" on:click={confirm} disabled={!!shiftOffsetError}>Shift</button>
    </ModalFooter>
  </Modal>
</div>

<style>
  .compact-modal {
    height: auto;
    max-height: 220px;
    max-width: 400px;
    padding: 0.75rem 1rem;
  }

  .form-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .row {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
  }

  .label {
    flex: 0 0 auto;
    font-weight: 500;
    margin-right: 0.5rem;
    min-width: 70px;
  }

  .toggle-group {
    align-items: stretch;
    border: 1px solid #ccc;
    border-radius: 6px;
    display: flex;
    flex: 0 0 auto;
    height: 2rem;
    overflow: hidden;
  }

  .toggle {
    align-items: center;
    background: #f9f9f9;
    border: none;
    cursor: pointer;
    display: flex;
    font-weight: 500;
    height: 100%;
    outline: none;
    padding: 0.5rem 1rem;
  }

  .toggle.active {
    background: #fff;
    font-weight: bold;
  }

  .shift-input {
    align-items: center;
    box-sizing: border-box;
    display: flex;
    flex: 0 0 auto;
    font-size: 0.75rem;
    height: 2rem;
    max-width: 200px;
    padding: 0.5rem 1rem;
    width: fit-content;
  }

  input.error {
    background-color: var(--st-input-error-background-color);
    border: 1px solid var(--st-red);
  }
</style>
