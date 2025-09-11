<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getTarget } from '../../utilities/generic';
  import { convertDurationStringToInterval } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  const dispatch = createEventDispatcher<{
    cancel: null;
    pack: { direction: 'Left' | 'Right'; gapOffset: string };
  }>();

  let direction: 'Left' | 'Right' = 'Left';
  let gapOffsetString: string = '0d 0h 0m 0s 0ms 0us';
  let gapOffsetError: string | null = '';
  let disabled: boolean = false;

  function setDirection(dir: 'Left' | 'Right') {
    direction = dir;
  }

  function cancel() {
    dispatch('cancel');
  }

  function pack() {
    dispatch('pack', { direction, gapOffset: gapOffsetString });
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

<div class="compact-modal">
  <Modal height={150} width={300}>
    <ModalHeader on:close={cancel}>Pack Directive(s)</ModalHeader>
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
            use:tooltip={{ content: 'The gap between directives when packed ', placement: 'top' }}
            for="gap-offset"
          >
            Offset:
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
        </div>
      </div>
    </ModalContent>

    <ModalFooter>
      <div class="button-container">
        <button class="st-button secondary" on:click={cancel}>Cancel</button>
        <button class="st-button" on:click={pack} disabled={!!gapOffsetError}>Pack</button>
      </div>
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

  .button-container {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  input.error {
    background-color: var(--st-input-error-background-color);
    border: 1px solid var(--st-red);
  }
</style>
