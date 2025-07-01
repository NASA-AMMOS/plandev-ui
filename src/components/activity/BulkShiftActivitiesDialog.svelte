<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getTarget } from '../../utilities/generic';
  import { convertDurationStringToInterval } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';

  const dispatch = createEventDispatcher();

  let direction: 'Left' | 'Right' = 'Left';
  let shiftDurationString: string = '0d 0h 0m 0s 0ms 0us';
  let shiftOffsetError: string | null = '';
  let disabled: boolean = false;

  function setDirection(dir: 'Left' | 'Right') {
    direction = dir;
  }

  function cancel() {
    dispatch('cancel');
  }

  function shift() {
    dispatch('shift', { direction, shiftOffset: shiftDurationString });
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

<div class="dialog">
  <div class="row">
    <div class="label">Direction</div>
    <div class="toggle-group">
      <button class="toggle {direction === 'Left' ? 'active' : ''}" on:click={() => setDirection('Left')}>Left</button>
      <button class="toggle {direction === 'Right' ? 'active' : ''}" on:click={() => setDirection('Right')}
        >Right</button
      >
    </div>
  </div>

  <Input layout="inline">
    <label
      use:tooltip={{ content: 'The duration of how much the activities should be shifted by', placement: 'top' }}
      for="start-offset"
    >
      Shift By:
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

  <div class="buttons">
    <button on:click={cancel}>Cancel</button>
    <button on:click={shift} disabled={!!shiftOffsetError}>Shift</button>
  </div>
</div>

<style>
  .dialog {
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    font-family: sans-serif;
    margin: auto;
    max-width: 300px;
    padding: 1rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .label {
    flex: 1;
    font-weight: 500;
    margin-right: 1rem;
    padding-top: 0.25rem;
  }

  .toggle-group {
    border: 1px solid #ccc;
    border-radius: 6px;
    display: flex;
    overflow: hidden;
  }

  .toggle {
    background: #f9f9f9;
    border: none;
    cursor: pointer;
    font-weight: 500;
    outline: none;
    padding: 0.5rem 1rem;
  }

  .toggle.active {
    background: #fff;
    font-weight: bold;
  }

  .buttons {
    display: flex;
    justify-content: space-between;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 500;
    padding: 0.5rem 1rem;
  }

  input.error {
    background-color: var(--st-input-error-background-color);
    border: 1px solid var(--st-red);
  }
</style>
